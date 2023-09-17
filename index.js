require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const git = require('simple-git');
const {Octokit} = require('@octokit/rest');
const fs = require('fs');

app.use(express.json());
app.use(cors());


let clone = async () => {
    try {
        //for security reasons we put the username and the repository in the .env file
        let userName = process.env.USERNAME;
        let repository = process.env.REPOSITORY;

        const repositoryUrl = `https://github.com/${userName}/${repository}.git`;
        const localDirectory = process.env.LOCAL_DIRECTORY;

        await git().clone(repositoryUrl, localDirectory);
        console.log('clone success');
    } catch (e) {
        throw e;
    }


}

branchCreation = async (branchName) => {

    try {

        const localDirectory = process.env.LOCAL_DIRECTORY;

        // Change the working directory to the local repository directory
        await git(localDirectory);
        // Create a new branch
        await git().checkoutLocalBranch(branchName);

        console.log(`New branch "${branchName}" created successfully.`);
        return branchName;
    } catch (e) {
        console.log(e.message)
        throw e;
    }

}

async function commitAndPush(branchName) {
    try {
        await git(process.env.LOCAL_DIRECTORY).add('.');
        await git(process.env.LOCAL_DIRECTORY).commit('Update configuration');
        await git(process.env.LOCAL_DIRECTORY).push('origin', branchName);

        console.log('Changes committed and pushed successfully.');
    } catch (error) {
        console.error('Error committing and pushing changes:', error.message);
        throw error;
    }
}

async function createPullRequest(owner, repo, base, head) {
    try {
        const octokit = new Octokit({
            auth: process.env.GITHUB_TOKEN, // Replace with a personal access token
        });

        const prResponse = await octokit.pulls.create({
            owner,
            repo,
            base,
            head,
            title: 'Feature: Creating New Environment and Scenario',
            body: 'Please review and merge this pull request.',
        });

        console.log('Pull request created successfully:', prResponse.data.html_url);
        return prResponse.data.html_url;
    } catch (error) {
        console.error('Error creating pull request:', error.message);
        throw error;
    }
}


async function modifyConfigFiles(localDirectory, environment, scenario) {
    try {

        const configFile = `${localDirectory}/config.json`;
        const configData = JSON.parse(fs.readFileSync(configFile, 'utf8'));

        configData.environment = environment;
        configData.scenario = scenario;

        fs.writeFileSync(configFile, JSON.stringify(configData, null, 2));

        console.log('Configuration files updated successfully.');
    } catch (error) {
        console.error('Error modifying configuration files:', error.message);
        throw error;
    }
}

app.post("/api/environment", async (req, res) => {


    const {environmentName, selectedScenario, selectedContainerImage} = req.body.environment;
    if (!environmentName || !selectedScenario || !selectedContainerImage) {
        return res.status(422).json({error: "please fill all the fields"})
    }
    const timestamp = Date.now();
    const branchName = `env-${environmentName}-scenario-${selectedScenario}-${timestamp}`;

    try {
        await clone()
        await branchCreation(branchName);

        await modifyConfigFiles(process.env.LOCAL_DIRECTORY, environmentName, selectedScenario)
        
        await commitAndPush(branchName);
        let pullRequestUrl = await createPullRequest(process.env.USERNAME, process.env.REPOSITORY, 'main', branchName);

        res.status(200).json({status: 'success', pullRequestUrl});

    } catch (e) {
        console.log(e.message)
        res.status(500).json({status: 'error'});
    }


})
app.listen(4000, () => console.log('server started'));

console.log('Hello from backend-task!');
