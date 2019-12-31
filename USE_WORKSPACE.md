# 本文解释如何配置基于 Yarn 的 Workspace

===

# Code Sharing

## Setup development environment.

### Requirements

* yarn > 1.0
  ### Steps
  > Maybe we can create CLI tools or Post install script.

1. Create `package.json` in your working folder.

```json
{
  "private": true,
  "workspaces": ["shared-lib1", "business-project1", "business-project2", "..."]
}
```

2. Clone projects to working folder. match names specified by workspaces in `package.json`.
3. Because we need build projects by Jenkins or other CI tools, and shared libs hosted in private repository, shared lib dependencies are ssh protocol. so developer need config ssh by `~/.ssh/config` to fetch dependent repositories. `Identityfile` is your private key for bitbucket.

```
Host bitbucket.org
Hostname bitbucket.org
Identityfile ~/key-for-bitbucket
User git
UserKnownHostsFile=/dev/null
StrictHostKeyChecking=no
```

3. Execute `yarn install` in working folder. Because shared lib dependency is versioned to remote repository path, when you start the project depends on this shared lib, the project will use the package of shared lib installed in `node_modules` under the project. If you want use shared lib cloned in working folder, you need delete the package in `node_modules` under the project, now your can modify shared lib code and sync change in the project on fly.

## Install project with private dependency

### Option 1. Using Dockerfile

> In this way, you need provide private key in code repository.

Dockerfile Sample

```Dockerfile
# ...

COPY . /rubick-devops
WORKDIR /rubick-devops/
RUN chmod 0600 ./private_key
RUN chmod +x ./ssh-bitbucket.sh
RUN pwd
RUN ls

# Tell git to use your `ssh-bitbucket.sh` script
ENV GIT_SSH="./ssh-bitbucket.sh"

RUN yarn install

# Remove the private key once npm install is complete
# To previous any nefarious activities
RUN rm ./private_key
```

### Option 2. Using Jenkins Credential

> This is recommond option. manage private key with Jenkins credential, no need provide in code repository.

Jenkinsfile Sample

```Groovy
pipeline{
  agent any
  stages{
    stage("checkout"){
        steps{
           git url:"https://chengjingtao@bitbucket.org/zhangmq/rubick-devops.git", credentialsId:"chengjingtao-bitbucket"
        }
      }
    stage("build"){
      steps{
        sshagent(credentials: ['zmq-sshkey']){
          sh "export GIT_SSH=./ssh-bitbucket.sh && chmod +x ./ssh-bitbucket.sh && yarn install"
        }
      }
    }
  }
}
```
