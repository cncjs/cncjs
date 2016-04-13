# Contributing to this project

## Running Local Development Server

Ensure you have Node v4 (or v5) installed, and run `npm run dev` to start a local development server for development and testing. Every code changes will trigger webpack Hot Module Replacement (HMR) which will be really useful while developing in React.

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
