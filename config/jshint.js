//
// http://www.jshint.com/docs/options/
//
module.exports = {
    /**
     * Enforcing options
     * When set to true, these options will make JSHint produce more warnings about your code.
     */

    // This option prohibits the use of bitwise operators such as ^ (XOR), | (OR) and others.
    // Bitwise operators are very rare in JavaScript programs and quite often & is simply a mistyped &&.
    bitwise: false,
    // This option allows you to force all variable names to use either camelCase style or UPPER_CASE with underscores.
    camelcase: false,
    // This option requires you to always put curly braces around blocks in loops and conditionals. 
    curly: true,
    // This options prohibits the use of == and != in favor of === and !==. 
    eqeqeq: true,
    // This option tells JSHint that your code needs to adhere to ECMAScript 3 specification. 
    es3: true,
    // This option requires all for in loops to filter object's items. 
    forin: false,
    // This option prohibits the use of immediate function invocations without wrapping them in parentheses.
    immed: true,
    // This option enforces specific tab width for your code. For example, the following code will trigger a warning on line 4:
    indent: 4,
    // This option prohibits the use of a variable before it was defined.
    latedef: true,
    // This option requires you to capitalize names of constructor functions. 
    newcap: true,
    // This option prohibits the use of arguments.caller and arguments.callee. 
    noarg: true,
    // This option warns when you have an empty block in your code. 
    noempty: false,
    // This option prohibits the use of constructor functions for side-effects.
    nonew: true,
    // This option prohibits the use of unary increment and decrement operators.
    plusplus: false,
    // This option enforces the consistency of quotation marks used throughout your code.
    quotmark: true,
    // This option prohibits the use of explicitly undeclared variables. 
    undef: true,
    // This option warns when you define and never use your variables. 
    unused: false,
    // This option requires all functions to run in ECMAScript 5's strict mode. 
    strict: false,
    // This option makes it an error to leave a trailing whitespace in your code. 
    trailing: false,

    /**
     * Relaxing options
     * When set to true, these options will make JSHint produce less warnings about your code.
     */

    // This option suppresses warnings about missing semicolons.
    asi: false,
    // This option suppresses warnings about the use of assignments in cases where comparisons are expected. 
    boss: false,
    // This option suppresses warnings about the debugger statements in your code.
    debug: false,
    // This option suppresses warnings about == null comparisons. 
    eqnull: false,
    // This option tells JSHint that your code uses ECMAScript 6 specific syntax.
    esnext: false,
    // This option suppresses warnings about the use of eval.
    evil: false,
    // This option suppresses warnings about the use of expressions where normally you would expect to see assignments or function calls. 
    expr: false,
    // This option suppresses warnings about declaring variables inside of control structures while accessing them later from the outside. 
    funcscope: false,
    // This option suppresses warnings about the use of global strict mode. 
    globalstrict: false,
    // This option suppresses warnings about the __iterator__ property. 
    iterator: false,
    // This option suppresses warnings about missing semicolons, but only when the semicolon is omitted for the last statement in a one-line block.
    lastsemic: false,
    // This option suppresses most of the warnings about possibly unsafe line breakings in your code.
    laxbreak: false,
    // This option suppresses warnings about comma-first coding style.
    laxcomma: false,
    // This option suppresses warnings about functions inside of loops.
    loopfunc: false,
    // This options tells JSHint that your code uses Mozilla JavaScript extensions.
    moz: false,
    // This option suppresses warnings about multi-line strings.
    multistr: false,
    // This option suppresses warnings about the __proto__ property.
    proto: false,
    // This option suppresses warnings about the use of script-targeted URLs—such as javascript:....
    scripturl: false,
    // This option suppresses warnings about mixed tabs and spaces when the latter are used for alignmnent only.
    smarttabs: false,
    // This option suppresses warnings about variable shadowing i.e. declaring a variable that had been already declared somewhere in the outer scope.
    shadow: false,
    // This option suppresses warnings about using [] notation when it can be expressed in dot notation
    sub: true,
    // This option suppresses warnings about "weird" constructions like new function () { ... } and new Object;. 
    supernew: false,
    // This option suppresses warnings about possible strict violations when the code is running in strict mode and you use this in a non-constructor function. 
    validthis: false,


    /**
     * Environments
     * These options let JSHint know about some pre-defined global variables.
     */
    // This option defines globals exposed by modern browsers.
    browser: true,

    globals: {
        __dirname: true,
        process: true,
        exports: true,
        module: true,
        console: true,
        define: true,
        require: true,
        requirejs: true,
        Buffer: true,
        JSON: true
    }
};
