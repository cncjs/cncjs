# Contributing

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

## Localization (L10n)

Find all resource strings stored in the <b>resource.json</b> file, which is located in the [src/web/i18n](https://github.com/cheton/cnc/tree/master/src/web/i18n) directory.

Moreover, you can make translations during runtime by modifying <b>resource.json</b> from the installed directory. Note that your path may differ based on the Node installation path you have in place.
```bash
$ cd $(dirname `which cnc`)
$ pwd
/Users/cheton/.nvm/versions/node/v4.4.3/bin
$ cd ../lib/node_modules/cncjs/dist/cnc/web/i18n/
```


## Running Local Development Server

Make sure you have Node.js 4 or later verions installed, and run `npm run dev` to start a local development server for development and testing. Every code changes will trigger webpack Hot Module Replacement (HMR) which will be really useful while developing in React.

```bash
$ git clone https://github.com/cheton/cnc.git
$ cd cnc
$ npm install
$ npm run dev  # it may take several minutes...
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
