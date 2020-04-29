# Capstone bootstrap repository

This is your repository for your capstone project. You will use this repository on your own for d0. If you elect to perform the rest of the capstone (d1, d2, and d3) on your own, we will update the repo for the rest of the project once you have completed d0. If you choose to work with a partner for the rest of the capstone (d1, d2, and d3), we will provision a new repository for you and your partner to work on together.

## Running AutoTest

To run AutoTest:

1. Make a local commit on your machine and push it to your GitHub repository (or edit a file directly using the GitHub web editor).

1. Go to that commit in the GitHub web interface.

1. In the comments textbox at the bottom of the commit page, add a `@ubcbot #d0` (or use whatever `#dX` you wish to invoke). AutoTest will comment back on your commit once it has analyzed it. For more details, please see the AutoTest instructions.

## Configuring your environment

To start using this repository, you need to get your computer configured so you can build and execute the code. To do this, follow these steps; the specifics of each step (especially the first two) will vary based on which operating system your computer has:

1. Install git (you should be able to execute `git --version` on the command line).

1. Install Node LTS  (8.9.X), which will also install NPM (you should be able to execute `node --version` and `npm --version` on the command line).

1. [Install Yarn](https://yarnpkg.com/en/docs/install). You should be able to execute `yarn --version` afterwards.

1. Clone the project on [https://github.com/secapstone](https://github.com/secapstone). You can find your team ID and clone the repo by visiting your project in GitHub and getting the clone target by clicking on the green button on your project repository.

## Project commands

Once your environment is configured you need to further prepare the project's tooling and dependencies. In the project folder:

1. `yarn clean` (or `yarn cleanwin` if you are using Windows) to delete your project's *node_modules* directory.

1. `yarn install` to download the packages specified in your project's *package.json* to the *node_modules* directory.

1. `yarn build` to compile your project. You must run this command after making changes to your TypeScript files.

1. `yarn test` to run the test suite.

## Running and testing from an IDE

You do not need to use any specific IDE for this capstone, but WebStorm should be automatically configured the first time you open the repository, should you choose to use it. For other IDEs and editors, you'll want to set up test and debug tasks and specify that the schema of all files in `test/queries` should follow `test/query.schema.json`.


