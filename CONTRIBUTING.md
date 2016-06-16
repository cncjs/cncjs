# Contributing

## Index
* [Code Contributions](https://github.com/cheton/cnc/blob/dev/CONTRIBUTING.md#code-contributions)
* [Running Local Development Server](https://github.com/cheton/cnc/blob/dev/CONTRIBUTING.md#running-local-development-server)
* [Running Production Build](https://github.com/cheton/cnc/blob/dev/CONTRIBUTING.md#running-production-build)
* [Localization](https://github.com/cheton/cnc/blob/dev/CONTRIBUTING.md#localization)

## Code Contributions

### Step 1: Fork

Fork the project [on GitHub](https://github.com/cheton/cnc) and check out your copy locally.

```bash
$ git clone git@github.com:yourusername/cnc.git
$ cd cnc
$ git remote add upstream git://github.com/cheton/cnc.git
```

### Step 2: Branch

Create a feature branch and before starting:
```bash
$ git checkout -b my-feature-branch -t origin/master
```

### Step 3: Install

Run `npm install` to install the dependencies in the local node_modules folder:
```bash
$ npm install
```

### Step 4: Commit

Make sure git knows your name and email address:
```bash
$ git config --global user.name "User Name"
$ git config --global user.email "user.email@example.com"
```

Writing good commit logs is important. A commit log should describe what changed and why.

### Step 5: Rebase

Use `git rebase` (not `git merge`) to sync your work from time to time.
```bash
$ git fetch upstream
$ git rebase upstream/master
```

### Step 6: Build

Run `npm run build` to make sure the build succeed:
```bash
$ npm run build
```

### Step 7: Push

```bash
$ git push origin my-feature-branch
```

Go to https://github.com/yourusername/cnc and select your feature branch. Click the <kbd>Pull Request</kbd> button and fill out the form.

## Running Local Development Server

Make sure you have Node.js 4 or later verions installed, and run `npm run dev` to start a local development server for development and testing. Every code changes will trigger webpack Hot Module Replacement (HMR) which will be really useful while developing in React.

```bash
$ npm install  # Ensure that packages are installed
$ npm run dev  # It may take several minutes...
  :  :  :
Server is listening on 0.0.0.0:8000
```

Connect to http://localhost:8000 and wait until bundle finished.
```bash
webpack: wait until bundle finished: /__webpack_hmr
  :  :  :
webpack: bundle is now VALID
```

Now you're ready to go!

## Running Production Build

```bash
$ npm install  # Ensure that packages are installed
$ npm run prepublish
$ ./bin/cnc -vv
  :  :  :
Server is listening on 0.0.0.0:8000
```

## Build Desktop Apps

#### OS X
```bash
$ npm install  # Ensure that packages are installed
$ npm run prepublish && npm run build:osx-x64
$ ls -al output/osx/
```

#### Windows x86
```bash
$ npm install  # Ensure that packages are installed
$ npm run prepublish && npm run build:win-ia32
$ ls -al output/win-ia32/
```

#### Windows x64
```bash
$ npm install  # Ensure that packages are installed
$ npm run prepublish && npm run build:win-x64
$ ls -al output/win/
```

#### Linux x86
```bash
$ npm install  # Ensure that packages are installed
$ npm run prepublish && npm run build:linux-ia32
$ ls -al output/linux-ia32/
```

#### Linux x64
```bash
$ npm install  # Ensure that packages are installed
$ npm run prepublish && npm run build:linux-x64
$ ls -al output/linux/
```

## Localization

### Static Translations 
Find all resource strings stored in the <b>resource.json</b> file, which is located in the [src/web/i18n](https://github.com/cheton/cnc/tree/master/src/web/i18n) directory. You can create a pull request to submit your changes.

### Runtime Translations
Moreover, you can make translations during runtime by modifying <b>resource.json</b> from the installed directory. Note that your path may differ based on the Node installation path you have in place.
```bash
$ cd $(dirname `which cnc`)/../lib/node_modules/cncjs/dist/web/i18n/
$ pwd
/home/cheton/.nvm/versions/node/v4.4.3/lib/node_modules/cncjs/dist/web/i18n
```

To verify your changes during runtime, it's recommended that you open Developer Tools and disable browser cache. For example:

##### Step 1: Open Developer Tools and click [Settings]
![image](https://cloud.githubusercontent.com/assets/447801/16014196/cc4b730c-31c2-11e6-9f78-c84347d12190.png)

##### Step 2: Disable cache
![image](https://cloud.githubusercontent.com/assets/447801/16014264/1d32e872-31c3-11e6-9178-6cc06bd0f6b5.png)

Now you can modify resource strings in the <b>dist/cnc/web/i18n</b> directory and refresh your browser to see the updates.

<b>Note that you should not close DevTools to make sure your browser won't cache anything.</b>
