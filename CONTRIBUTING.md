# Contributing

## Index
* [Troubleshooting](CONTRIBUTING.md#troubleshooting)
* [Code Contributions](CONTRIBUTING.md#code-contributions)
* [Keeping a Fork Up-to-date](CONTRIBUTING.md#keeping-a-fork-up-to-date)
* [Running Local Development Server](CONTRIBUTING.md#running-local-development-server)
* [Running Production Build](CONTRIBUTING.md#running-production-build)
* [Build Desktop Apps](CONTRIBUTING.md#build-desktop-apps)
* [Localization](CONTRIBUTING.md#localization)
* [Translation Validation](CONTRIBUTING.md#translation-validation)

## Troubleshooting

https://github.com/cncjs/cncjs/wiki/Troubleshooting

## Code Contributions

### Step 1: Fork

Fork the project [on GitHub](https://github.com/cncjs/cncjs) and check out your copy locally. 

![image](https://cloud.githubusercontent.com/assets/447801/16153930/28241308-34db-11e6-81b6-dd8222f044b4.png)

```bash
$ git clone git@github.com:username/cncjs.git
$ cd cncjs
$ git remote add upstream git://github.com/cncjs/cncjs.git
```

### Step 2: Branch

Create a feature branch and before starting:
```bash
$ git checkout -b my-feature-branch -t origin/master
```

### Step 3: Install

Run `yarn install` to install the dependencies in the local node_modules folder:
```bash
$ npm install -g yarn
$ yarn install
```

### Step 4: Commit

Make sure git knows your name and email address:
```bash
$ git config --global user.name "User Name"
$ git config --global user.email "user.email@example.com"
```

Writing good commit logs is important. A commit log should describe what changed and why.

### Step 5: Rebase

Use `git rebase` or `git merge` to sync your work from time to time.
```bash
$ git fetch upstream
$ git rebase upstream/master
```

### Step 6: Build (Optional)

Run `yarn build` to make sure the build succeed:
```bash
$ yarn build
```

### Step 7: Push

```bash
$ git push origin my-feature-branch
```

Go to https://github.com/username/cncjs and select your feature branch. Click on the <kbd>New pull request</kbd> button and fill out the form.

![image](https://cloud.githubusercontent.com/assets/447801/16153975/6a41541c-34db-11e6-997c-5781b8fa8f68.png)

## Keeping a Fork Up-to-date

### Clone your fork

```bash
git clone git@github.com:USERNAME/cncjs.git
```

### Add remote from original repository in your forked repository

```bash
cd cncjs
git remote add upstream git://github.com/cncjs/cncjs.git
git fetch upstream
```

### Updating your fork from original repo to keep up with their changes

```bash
git pull upstream master
```

### Push the local branch to the remote repository

```bash
git pull origin master
git push origin master
```

## Running Local Development Server

Make sure you have the latest Node.js version installed, and run `yarn dev` to start a local development server for development and testing. Every code changes will trigger webpack Hot Module Replacement (HMR) which will be really useful while developing in React.

```bash
$ yarn install  # Ensure that packages are installed
$ yarn dev  # It may take several minutes...
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
$ yarn install  # Ensure that packages are installed
$ yarn build
$ ./bin/cncjs -vv
  :  :  :
Server is listening on 0.0.0.0:8000
```

## Build Desktop Apps

#### macOS (x64)
```bash
$ yarn build && yarn build:macos-x64
```

#### macOS (arm64)
```bash
$ yarn build && yarn build:macos-arm64
```

#### Windows (x64)
```bash
$ yarn build && yarn build:windows-x64
```

#### Linux (x64)
```bash
$ yarn build && yarn build:linux-x64
```

## Localization

If you'd like to help contribute translations, you can fork the repository, update resource files in the [src/app/i18n](https://github.com/cncjs/cncjs/tree/master/src/app/i18n) directory or in the [src/server/i18n](https://github.com/cncjs/cncjs/tree/master/src/server/i18n) directory, and create a pull request to submit your changes.

### Fork the repository

To fork the cncjs repository, click the <b>Fork</b> button in the header of the repository.

![image](https://user-images.githubusercontent.com/447801/30472117-d757e742-9a2d-11e7-80f8-4ba9ffba97d8.png)

When it’s finished, you’ll be taken to your copy of the cncjs repository. Now you can update the resource files on GitHub, or clone it to your computer.

If you're using <b>GitHub for Desktop</b> application, navigate over to the toolbar, open the <b>Clone or download</b> dropdown, and click <b>Open in Desktop</b> to clone cncjs/cncjs to your computer and use it in GitHub Desktop.

![image](https://user-images.githubusercontent.com/447801/30471510-956b51fe-9a2b-11e7-9e43-c5e3fa19e0cb.png)

### Making and pushing changes

Go ahead and make a few changes to the project using your favorite text editor. When you’re ready to submit your changes, type up a commit summary in <b>GitHub for Desktop</b>, and click <b>Commit to master</b>.

![image](https://user-images.githubusercontent.com/447801/30475410-568ff97c-9a39-11e7-9e25-a924ad910deb.png)

You can continue to make more changes and create new commits. When you’re ready to push your changes, click on the <b>Sync</b> button to synchronize master with the remote server.

![image](https://user-images.githubusercontent.com/447801/30475598-f5b90a34-9a39-11e7-870a-2517f124dbba.png)

### Creating the pull request

1. Head on over to the repository on GitHub.com where your project lives. For your example, it would be at `https://www.github.com/<your_username>/cncjs`.
  ![image](https://user-images.githubusercontent.com/447801/30475866-ce417044-9a3a-11e7-814f-c991a92a3be3.png)

2. To the right of the branch menu, click <b>New pull request</b>.<br>
  ![image](https://user-images.githubusercontent.com/447801/30476056-66f33548-9a3b-11e7-9d9a-e2d010cbc379.png)

3. Click <b>Create pull request</b>.
  ![image](https://user-images.githubusercontent.com/447801/30476803-bd3b1428-9a3d-11e7-8588-90d77f3680b5.png)

4. That's done.

## Translation Validation

You can validate the translation by copying translated resource files to the installed directory. Note that your path may differ based on the Node installation path you have in place.
```bash
$ cd $(dirname `which cncjs`)/../lib/node_modules/cncjs/dist/app/i18n/
$ pwd
/home/cheton/.nvm/versions/node/v{node-version}/lib/node_modules/cncjs/dist/app/i18n
```

To verify your changes during runtime, it's recommended that you open <b>Developer Tools</b> and disable browser cache. For example:

##### Step 1: Open Developer Tools and click [Settings]
![image](https://cloud.githubusercontent.com/assets/447801/16014196/cc4b730c-31c2-11e6-9f78-c84347d12190.png)

##### Step 2: Disable cache
![image](https://cloud.githubusercontent.com/assets/447801/16014264/1d32e872-31c3-11e6-9178-6cc06bd0f6b5.png)

Now you can copy resource files to the <b>dist/cncjs/app/i18n</b> directory and refresh your browser to see new updates.

<b>Note that you should not close DevTools to make sure your browser won't cache anything.</b>
