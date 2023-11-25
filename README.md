# How to run the project

## Requirements

- npm
- node
- yarn

## Install dependencies

Go to the subdirectory of the project and run the following command on each one:

```bash
yarn install
```

## Run the project

Open two terminals and run the following commands on each one:

```bash
yarn dev # for the frontend
```

```bash
nodemon index.js # for the backend
```

you should have nodemon installed globally to be able to run the backend, if not, run the following command:

```bash
npm install -g nodemon
```

or you can run the backend without nodemon, just run the following command:

```bash
node index.js
```

before running those commands, make sure you have the .env files on each subdirectory of the project.
