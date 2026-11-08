#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { parseSync, traverse } = require('@babel/core');

const posix = filename => filename.split(path.sep).join('/');
const propertyName = node => node?.name || node?.value;
const bannedPackages = ['styled-components', 'react-repeatable', 'react-foreach', 'react-infinite-tree',
  'rc-trigger', 'react-bootstrap-buttons', 'react-select', 'create-react-class',
  'react-animate-height', 'react-datepicker', 'react-facebook-loading', 'uncontrollable'];
const httpPackages = ['axios', 'superagent', 'superagent-use'];
const dangerousMembers = ['findDOMNode', 'getWrappedInstance', 'useImperativeHandle', 'widgetMap', 'primaryWidgets', 'secondaryWidgets'];
const readSources = directory => (fs.existsSync(directory) ? fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  const filename = path.join(directory, entry.name);
  if (entry.isDirectory()) {
    return entry.name === '__tests__' ? [] : readSources(filename);
  }
  return /\.(js|jsx)$/.test(filename) ? [filename] : [];
}) : []);

/** Scan without loading app modules or evaluating fixture code. */
function checkProject({ root = path.resolve(__dirname, '..'), policy = require('./ui-migration-allowlist.json') } = {}) {
  const violations = [];
  const modules = new Map();
  const report = (file, rule, node, message) => {
    const item = { file, line: node?.loc?.start.line || 1, rule, message };
    if (!violations.some(existing => JSON.stringify(existing) === JSON.stringify(item))) {
      violations.push(item);
    }
  };
  const boundaries = policy.httpBoundaries || {};
  Object.entries(boundaries).forEach(([file, entry]) => {
    if (!['query', 'transport', 'download'].includes(entry.role)) {
      report(file, 'invalid-allowlist', null, 'Unknown HTTP boundary role');
    }
    if (entry.role === 'download' && (!entry.members?.length || entry.members.some(name => !name || name.includes('*')))) {
      report(file, 'invalid-allowlist', null, 'Download exception requires exact permitted members');
    }
    if (!/^src\/app\/.+\.(js|jsx)$/.test(file) || /[*?]/.test(file) || !entry.reason?.trim()) {
      report(file, 'invalid-allowlist', null, 'HTTP exceptions require a full file path and a reason');
    }
  });
  Object.entries(policy.domainClasses || {}).forEach(([file, entries]) => entries.forEach(entry => {
    if (!entry.name || !entry.reason?.trim() || /[*?]/.test(file) || !/^src\/app\/.+\.(js|jsx)$/.test(file)) {
      report(file, 'invalid-allowlist', null, 'Domain classes require an exact file/name and reason');
    }
  }));

  readSources(path.join(root, 'src/app')).forEach(filename => {
    const file = posix(path.relative(root, filename));
    const source = fs.readFileSync(filename, 'utf8');
    try {
      const ast = parseSync(source, { filename, configFile: false, babelrc: false, parserOpts: { sourceType: 'unambiguous', plugins: ['jsx'] } });
      const record = { file, ast, exports: new Map(), stars: [], edges: [], classes: [] };
      traverse(ast, { Program(p) {
        record.program = p;
      } });
      modules.set(file, record);
    } catch (error) {
      report(file, 'parse-error', null, error.message.split('\n')[0]);
    }
  });
  const resolve = (file, request) => {
    let candidate;
    if (request === '@app' || request === 'app') {
      candidate = 'src/app';
    } else if (/^(?:@app|app)\//.test(request)) {
      candidate = 'src/app/' + request.replace(/^(?:@app|app)\//, '');
    } else if (request.startsWith('.')) {
      candidate = posix(path.normalize(path.join(path.dirname(file), request)));
    } else {
      return { external: request };
    }
    const found = [candidate, candidate + '.js', candidate + '.jsx', candidate + '/index.js', candidate + '/index.jsx'].find(item => modules.has(item));
    return { file: found || candidate };
  };
  const addEdge = (record, request, node) => record.edges.push({ request, target: resolve(record.file, request), node });
  const member = p => p?.isMemberExpression() || p?.isOptionalMemberExpression();
  const stringArg = p => (p.get('arguments.0')?.isStringLiteral() ? p.node.arguments[0].value : null);
  const moduleCall = p => p.isCallExpression() && ((p.get('callee').isIdentifier({ name: 'require' }) && !p.scope.getBinding('require')) || p.node.callee.type === 'Import');

  modules.forEach(record => {
    traverse(record.ast, {
      ImportDeclaration(p) {
        addEdge(record, p.node.source.value, p.node);
      },
      ExportAllDeclaration(p) {
        record.stars.push(p.node.source.value);
        addEdge(record, p.node.source.value, p.node);
      },
      ExportNamedDeclaration(p) {
        if (p.node.source) {
          addEdge(record, p.node.source.value, p.node);
        }
        p.get('specifiers').forEach(s => {
          record.exports.set(propertyName(s.node.exported), p.node.source
            ? { request: p.node.source.value, name: propertyName(s.node.local) || '*', namespace: s.isExportNamespaceSpecifier() }
            : { expression: s.get('local') });
        });
        const declaration = p.get('declaration');
        if (declaration.isFunctionDeclaration() || declaration.isClassDeclaration()) {
          record.exports.set(declaration.node.id.name, { expression: declaration });
        }
        if (declaration.isVariableDeclaration()) {
          declaration.get('declarations').forEach(d => {
            if (d.get('id').isIdentifier()) {
              record.exports.set(d.node.id.name, { expression: d.get('init') });
            }
          });
        }
      },
      ExportDefaultDeclaration(p) {
        record.exports.set('default', { expression: p.get('declaration') });
      },
      AssignmentExpression(p) {
        const left = p.get('left');
        if (!member(left)) {
          return;
        }
        const object = left.get('object');
        const key = propertyName(left.node.property);
        if ((object.isIdentifier({ name: 'module' }) && key === 'exports') || object.isIdentifier({ name: 'exports' })) {
          record.exports.set(object.isIdentifier({ name: 'exports' }) ? key : 'default', { expression: p.get('right') });
        } else if (member(object) && object.get('object').isIdentifier({ name: 'module' }) && propertyName(object.node.property) === 'exports') {
          record.exports.set(key, { expression: p.get('right') });
        }
      },
      CallExpression(p) {
        if (!moduleCall(p)) {
          return;
        }
        const request = stringArg(p);
        if (request) {
          addEdge(record, request, p.node);
        } else {
          report(record.file, 'dynamic-module', p.node, 'Nonliteral module loading cannot be audited');
        }
      },
      Class(p) {
        record.classes.push(p);
      },
    });
  });

  const seen = new Set();
  const withGuard = (key, callback) => {
    if (seen.has(key)) {
      return null;
    }
    seen.add(key);
    const result = callback();
    seen.delete(key);
    return result;
  };
  const httpRoot = file => file === 'src/app/api' || file.startsWith('src/app/api/');
  const originForModule = (file, request, name = '*') => {
    const target = resolve(file, request);
    if (target.external) {
      const pkg = target.external.split('/')[0];
      if (httpPackages.includes(pkg)) {
        return { kind: 'http', source: target.external, members: name === '*' || name === 'default' ? [] : [name] };
      }
      if (target.external === '@tanstack/react-query') {
        return { kind: 'query', members: name === '*' || name === 'default' ? [] : [name] };
      }
      if (['react', 'react-dom', 'create-react-class'].includes(target.external)) {
        return { kind: target.external, members: name === '*' || name === 'default' ? [] : [name] };
      }
      return null;
    }
    if (httpRoot(target.file)) {
      return { kind: 'http', source: target.file, members: name === '*' || name === 'default' ? [] : [name] };
    }
    if (name === '*') {
      return { kind: 'namespace', file: target.file, members: [] };
    }
    return exportOrigin(target.file, name);
  };
  const exportOrigin = (file, name) => withGuard('export:' + file + ':' + name, () => {
    const record = modules.get(file);
    if (!record) {
      return null;
    }
    const entry = record.exports.get(name);
    if (entry?.request) {
      return originForModule(file, entry.request, entry.namespace ? '*' : entry.name);
    }
    if (entry?.expression) {
      return expressionOrigin(file, entry.expression);
    }
    for (const request of record.stars) {
      const result = originForModule(file, request, name);
      if (result) {
        return result;
      }
    }
    // CommonJS module.exports = { named: value }.
    const defaultExport = record.exports.get('default')?.expression;
    if (defaultExport?.isObjectExpression()) {
      const prop = defaultExport.get('properties').find(p => propertyName(p.node.key) === name);
      if (prop?.isObjectProperty()) {
        return expressionOrigin(file, prop.get('value'));
      }
    }
    return null;
  });
  const functionOrigin = (file, p) => {
    const name = p.node.id?.name || p.parentPath?.node.id?.name;
    const bodyOrigin = p.isArrowFunctionExpression() && !p.get('body').isBlockStatement() ? expressionOrigin(file, p.get('body')) : null;
    let result = bodyOrigin && ['http', 'react', 'class', 'create-react-class'].includes(bodyOrigin.kind) ? bodyOrigin : null;
    let options = bodyOrigin?.kind === 'query-options' ? bodyOrigin : null;
    let directHTTP = null;
    let usesQuery = false;
    p.traverse({
      CallExpression(call) {
        const origin = expressionOrigin(file, call.get('callee'));
        if (origin?.kind === 'http') {
          result = origin;
          if (call.getFunctionParent() === p) {
            directHTTP = origin;
          }
        }
        if (origin?.kind === 'query-hook' || (origin?.kind === 'query' &&
          origin.members?.some(memberName => ['useQuery', 'useQueries', 'useInfiniteQuery', 'useMutation'].includes(memberName)))) {
          usesQuery = true;
        }
      },
      ReturnStatement(statement) {
        if (statement.getFunctionParent() !== p) {
          return;
        }
        const origin = expressionOrigin(file, statement.get('argument'));
        if (origin?.kind === 'query-options') {
          options = origin;
        } else if (origin && ['http', 'react', 'class', 'create-react-class'].includes(origin.kind)) {
          result = origin;
        }
      },
    });
    if (options && !directHTTP) {
      return options;
    }
    if (boundaries[file]?.role === 'query' && /^use[A-Z]/.test(name || '') && usesQuery && !directHTTP) {
      return { kind: 'query-hook', source: file, members: [name] };
    }
    if (directHTTP) {
      result = directHTTP;
    }
    return result?.kind === 'http' ? { ...result, callable: true } : result;
  };
  const expressionOrigin = (file, p) => {
    if (!p?.node) {
      return null;
    }
    return withGuard('expression:' + file + ':' + p.node.start + ':' + p.node.end + ':' + p.node.type, () => {
      if (p.isIdentifier()) {
        const binding = p.scope.getBinding(p.node.name);
        if (!binding) {
          if (['fetch', 'XMLHttpRequest'].includes(p.node.name)) {
            return { kind: 'http', source: p.node.name, members: [] };
          }
          if (['window', 'globalThis', 'self'].includes(p.node.name)) {
            return { kind: 'browser', members: [] };
          }
          return null;
        }
        const declaration = binding.path;
        if (declaration.isImportSpecifier() || declaration.isImportDefaultSpecifier() || declaration.isImportNamespaceSpecifier()) {
          let importedName = 'default';
          if (declaration.isImportSpecifier()) {
            importedName = propertyName(declaration.node.imported);
          }
          if (declaration.isImportNamespaceSpecifier()) {
            importedName = '*';
          }
          return originForModule(file, declaration.parent.source.value, importedName);
        }
        if (declaration.isVariableDeclarator()) {
          const reassigned = binding.constantViolations.filter(item => item.isAssignmentExpression()).map(item => expressionOrigin(file, item.get('right'))).find(Boolean);
          const base = reassigned || expressionOrigin(file, declaration.get('init'));
          if (declaration.get('id').isObjectPattern()) {
            const prop = declaration.get('id.properties').find(item => item.node.value?.name === p.node.name);
            return prop ? appendMember(base, propertyName(prop.node.key)) : base;
          }
          return base;
        }
        if (declaration.isClassDeclaration()) {
          return { kind: 'class', file, expression: declaration };
        }
        if (declaration.isFunctionDeclaration()) {
          return functionOrigin(file, declaration);
        }
        return null;
      }
      if (member(p)) {
        return appendMember(expressionOrigin(file, p.get('object')), p.node.computed && !p.get('property').isStringLiteral() ? '*' : propertyName(p.node.property));
      }
      if (moduleCall(p)) {
        return originForModule(file, stringArg(p) || '(dynamic)');
      }
      if (p.isClassDeclaration() || p.isClassExpression()) {
        return { kind: 'class', file, expression: p };
      }
      if (p.isFunctionDeclaration() || p.isFunctionExpression() || p.isArrowFunctionExpression()) {
        return functionOrigin(file, p);
      }
      if (p.isObjectExpression()) {
        const properties = p.get('properties').filter(prop => prop.isObjectProperty());
        const queryFn = properties.find(prop => propertyName(prop.node.key) === 'queryFn');
        const transport = queryFn ? expressionOrigin(file, queryFn.get('value')) : null;
        if (boundaries[file]?.role === 'query' && transport?.kind === 'http' && transport.callable !== false && properties.some(prop => propertyName(prop.node.key) === 'queryKey')) {
          return { kind: 'query-options', transport, members: [] };
        }
        return properties.map(prop => expressionOrigin(file, prop.get('value'))).find(origin => origin?.kind === 'http') || null;
      }
      if (p.isAwaitExpression()) {
        return expressionOrigin(file, p.get('argument'));
      }
      if (p.isCallExpression()) {
        const origin = expressionOrigin(file, p.get('callee'));
        return origin?.kind === 'http' ? { ...origin, callable: false } : origin;
      }
      return null;
    });
  };
  const appendMember = (origin, key) => {
    if (!origin) {
      return null;
    }
    if (origin.kind === 'browser' && ['fetch', 'XMLHttpRequest'].includes(key)) {
      return { kind: 'http', source: key, members: [] };
    }
    if (origin.kind === 'query-options' && key === 'queryFn') {
      return origin.transport;
    }
    if (origin.kind === 'namespace') {
      return exportOrigin(origin.file, key);
    }
    return { ...origin, members: [...(origin.members || []), key] };
  };
  const isReactBase = origin => {
    if (!origin) {
      return false;
    }
    if (origin.kind === 'react') {
      return ['Component', 'PureComponent', '*'].includes(origin.members?.[0]);
    }
    if (origin.kind === 'class') {
      return withGuard('base:' + origin.file + ':' + origin.expression.node.start, () => isReactBase(expressionOrigin(origin.file, origin.expression.get('superClass'))));
    }
    return false;
  };
  const isUI = file => /^src\/app\/(widgets|pages|containers)\//.test(file);
  const allowHTTP = (file, origin) => {
    const boundary = boundaries[file];
    if (!boundary) {
      return false;
    }
    return !boundary.members || boundary.members.includes(origin.members?.join('.'));
  };
  const inspectOrigin = (file, origin, node) => {
    if (!origin) {
      return;
    }
    if (origin.kind === 'http' && !allowHTTP(file, origin)) {
      report(file, 'http-boundary', node, 'HTTP transport requires a named query/auth/bootstrap/download owner');
    }
    if (origin.kind === 'react-dom' && origin.members?.includes('findDOMNode')) {
      report(file, 'instance-api', node, 'findDOMNode is forbidden');
    }
    if (origin.kind === 'react' && origin.members?.includes('useImperativeHandle')) {
      report(file, 'instance-api', node, 'Imperative component handles are forbidden');
    }
    if (boundaries[file]?.nonReact && (origin.kind === 'query-hook' || (origin.kind === 'query' && origin.members?.some(name => /^use[A-Z]/.test(name))) || (origin.kind === 'react' && origin.members?.some(name => /^use[A-Z]/.test(name))))) {
      report(file, 'non-react-hook', node, 'Non-React boundary cannot import or call hooks');
    }
  };

  modules.forEach(record => {
    const { file } = record;
    record.edges.forEach(edge => {
      const pkg = edge.request;
      if (bannedPackages.some(name => pkg === name || pkg.startsWith(name + '/')) || pkg.startsWith('@trendmicro/react-')) {
        report(file, 'legacy-ui', edge.node, 'Legacy UI module ' + pkg);
      }
      const target = edge.target.file;
      if (target?.startsWith('src/app/components/')) {
        const family = target.slice('src/app/components/'.length).split('/')[0];
        if (!policy.componentFamilies?.[family]) {
          report(file, 'legacy-ui', edge.node, 'Unapproved shared component family ' + family);
        }
      }
      if (target && /(?:createFetchMachine|fetchMacrosService|\/hooks\/use(?:Async|Fetch))(?:[./]|$)/.test(target)) {
        report(file, 'legacy-fetch', edge.node, 'Obsolete fetch abstraction');
      }
      if (edge.target.external && httpPackages.some(name => pkg === name || pkg.startsWith(name + '/'))) {
        inspectOrigin(file, { kind: 'http', members: [], source: pkg }, edge.node);
      }
      if (target && httpRoot(target) && !boundaries[file]?.members) {
        inspectOrigin(file, { kind: 'http', members: [], source: target }, edge.node);
      }
    });
    record.classes.forEach(p => {
      const name = p.node.id?.name;
      const superClass = p.get('superClass');
      const base = expressionOrigin(file, superClass);
      let wrapsReactBase = false;
      if (superClass.node) {
        superClass.traverse({ ReferencedIdentifier(ref) {
          let usage = ref;
          while (member(usage.parentPath) && usage.parentPath.get('object') === usage) {
            usage = usage.parentPath;
          }
          if (isReactBase(expressionOrigin(file, usage))) {
            wrapsReactBase = true;
          }
        } });
      }
      if (isReactBase(base) || wrapsReactBase) {
        report(file, 'react-class', p.node, 'React class inheritance is forbidden, including aliased/indirect bases');
      } else if (!(policy.domainClasses?.[file] || []).some(entry => entry.name === name)) {
        report(file, 'unlisted-class', p.node, 'Domain class requires an exact file/name/reason allowlist entry');
      }
    });
    traverse(record.ast, {
      Identifier(p) {
        if (['createFetchMachine', 'fetchMacrosService'].includes(p.node.name)) {
          report(file, 'legacy-fetch', p.node, 'Obsolete fetch abstraction');
        }
      },
      NewExpression(p) {
        inspectOrigin(file, expressionOrigin(file, p.get('callee')), p.node);
      },
      ImportDeclaration(p) {
        p.get('specifiers').forEach(specifier => {
          const binding = p.scope.getBinding(specifier.node.local.name);
          // Namespace/default references are inspected per member to constrain browser downloads.
          if (binding?.referencePaths.length) {
            binding.referencePaths.forEach(ref => {
              let usage = ref;
              while (member(usage.parentPath) && usage.parentPath.get('object') === usage) {
                usage = usage.parentPath;
              }
              inspectOrigin(file, expressionOrigin(file, usage), usage.node);
            });
          } else {
            inspectOrigin(file, expressionOrigin(file, specifier.get('local')), specifier.node);
          }
        });
      },
      ExportNamedDeclaration(p) {
        p.get('specifiers').forEach(s => {
          if (p.node.source) {
            inspectOrigin(file, originForModule(file, p.node.source.value, propertyName(s.node.local)), s.node);
          }
        });
      },
      CallExpression(p) {
        const origin = expressionOrigin(file, p.get('callee'));
        inspectOrigin(file, origin, p.node);
        if ((origin?.kind === 'react' && origin.members?.includes('createClass')) || origin?.kind === 'create-react-class') {
          report(file, 'react-class', p.node, 'Legacy React class factory');
        }
        if (p.get('callee').isIdentifier() && ['createFetchMachine', 'fetchMacrosService'].includes(p.node.callee.name)) {
          report(file, 'legacy-fetch', p.node, 'Obsolete fetch abstraction');
        }
        if (moduleCall(p)) {
          inspectOrigin(file, originForModule(file, stringArg(p) || '(dynamic)'), p.node);
        }
      },
      'MemberExpression|OptionalMemberExpression'(p) {
        const key = propertyName(p.node.property);
        if (dangerousMembers.includes(key)) {
          report(file, 'instance-api', p.node, 'Forbidden component instance API: ' + key);
        }
        if (p.get('object').isThisExpression() && key === 'visualizer') {
          report(file, 'instance-api', p.node, 'Cross-component visualizer instance');
        }
        if (member(p.get('object')) && propertyName(p.node.object.property) === 'current' && ['collapse', 'expand', 'settings'].includes(key)) {
          report(file, 'instance-api', p.node, 'Imperative component ref API: ' + key);
        }
        if (['state', 'value'].includes(key) && member(p.get('object')) && ['mdi', 'general'].includes(propertyName(p.node.object.property))) {
          report(file, 'instance-api', p.node, 'Child component state/value access');
        }
      },
    });
    // No JSX presentation can acquire an HTTP exception intended for a pure query/transport owner.
    if (boundaries[file] && boundaries[file].role !== 'download') {
      traverse(record.ast, {
        JSXElement(p) {
          report(file, 'boundary-presentation', p.node, 'HTTP boundary modules cannot render React UI');
        },
      });
    }
    if (isUI(file) && boundaries[file]?.nonReact) {
      report(file, 'invalid-allowlist', null, 'UI files cannot be non-React exceptions');
    }
  });

  Object.entries(policy.componentFamilies || {}).forEach(([name, entry]) => {
    if (!entry.reason?.trim() || !entry.test || /[*/]/.test(name)) {
      report('src/app/components/' + name, 'invalid-allowlist', null, 'Component family requires a reason and test');
    }
  });
  const components = path.join(root, 'src/app/components');
  if (fs.existsSync(components)) {
    fs.readdirSync(components, { withFileTypes: true }).filter(entry => entry.isDirectory()).forEach(entry => {
      if (!policy.componentFamilies?.[entry.name]) {
        report('src/app/components/' + entry.name, 'legacy-ui', null, 'Unapproved shared component directory');
      }
    });
  }
  const manifest = path.join(root, 'package.json');
  if (fs.existsSync(manifest)) {
    const pkg = JSON.parse(fs.readFileSync(manifest, 'utf8'));
    Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).forEach(name => {
      if (bannedPackages.includes(name) || name.startsWith('@trendmicro/react-')) {
        report('package.json', 'legacy-ui', null, 'Legacy UI dependency ' + name);
      }
    });
  }
  const classes = [...modules.values()].reduce((sum, record) => sum + record.classes.length, 0);
  violations.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.rule.localeCompare(b.rule));
  return { files: modules.size, classes, violations };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== '--root')) {
    console.error('Usage: node scripts/check-ui-migration.js [--root <project>]');
    process.exit(2);
  }
  const result = checkProject(args.length ? { root: path.resolve(args[1]) } : {});
  if (!result.files) {
    result.violations.push({ file: 'src/app', line: 1, rule: 'missing-source', message: 'No production JavaScript sources found' });
  }
  result.violations.forEach(item => console.error(`${item.file}:${item.line} [${item.rule}] ${item.message}`));
  console.log(`UI migration: ${result.files} files, ${result.classes} domain classes, ${result.violations.length} violations`);
  process.exitCode = result.violations.length ? 1 : 0;
}
module.exports = { checkProject };
