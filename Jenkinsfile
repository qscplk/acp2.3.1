// https://jenkins.io/doc/book/pipeline/syntax/
@Library('alauda-cicd') _

// global variables for pipeline
def GIT_BRANCH
def GIT_COMMIT
def deployment
// image can be used for promoting...
def IMAGE
// def IMAGE_E2E
def RELEASE_VERSION
def RELEASE_BUILD
def CHANGE_TARGET
def CHANGE_TITLE
def code_data
def DEBUG = false
def PROXY_CREDENTIALS
def release
pipeline {
	agent { label 'chromenew' }

	options {
		buildDiscarder(logRotator(numToKeepStr: '10'))
		disableConcurrentBuilds()

		skipDefaultCheckout()
	}
	environment {
		// FOLDER = "$GOPATH/src/alauda.io/diablo"
		FOLDER = "."
		BACKEND_FOLDER = "src/backend"

		// for building an scanning
		REPOSITORY = "diablo-clone"
		OWNER = "mathildetech"
		// sonar feedback user
		// needs to change together with the credentialsID
		BITBUCKET_FEEDBACK_ACCOUNT = "alaudabot"
		SONARQUBE_BITBUCKET_CREDENTIALS = "alaudabot"
		NAMESPACE = "alauda-system"
		DEPLOYMENT = "appcore-diablo"
		CONTAINER = "backend"
		DINGDING_BOT = "devops-chat-bot"
		ASF_DINGDING_BOT = "asf-robot"
		TAG_CREDENTIALS = "alaudabot-bitbucket"
		IMAGE_REPOSITORY = "index.alauda.cn/alaudak8s/diablo-clone"
		FRONT_IMAGE_REPOSITORY = "index.alauda.cn/alaudak8s/diablo-clone-front"
		IMAGE_CREDENTIALS = "alaudak8s"
		// E2E_IMAGE = "index.alauda.cn/alaudak8s/diablo-e2e"
		// TEST_REPORT_FOLDER = "test_report"
		PROXY_CREDENTIALS_ID = 'proxy'
		// setting gopath for golang environment
		// GOPATH = "${WORKSPACE}"
		CHARTS_PIPELINE = "/common/common-charts-pipeline"
		CHART_NAME = "alauda-devops"
		CHART_COMPONENT = "diablo"
	}
	// stages
	stages {
		stage('Checkout') {
			steps {
				script {
					dir(FOLDER) {
						container('tools') {
							// checkout code
							withCredentials([
								usernamePassword(credentialsId: PROXY_CREDENTIALS_ID, passwordVariable: 'PROXY_ADDRESS', usernameVariable: 'PROXY_ADDRESS_PASS')
							]) { PROXY_CREDENTIALS = "${PROXY_ADDRESS}" }
							sh "git config --global http.proxy ${PROXY_CREDENTIALS}"
							def scmVars
							retry(2) { scmVars = checkout scm }
							release = deploy.release(scmVars)

							RELEASE_BUILD = release.commit
							RELEASE_VERSION = release.majorVersion
							// echo "release ${RELEASE_VERSION} - release build ${RELEASE_BUILD}"
							echo """
								release ${RELEASE_VERSION}
								version ${release.version}
								is_release ${release.is_release}
								is_build ${release.is_build}
								is_master ${release.is_master}
								deploy_env ${release.environment}
								// auto_test ${release.auto_test}
								environment ${release.environment}
								majorVersion ${release.majorVersion}
								release.change ${release.change}
							"""
							// copying kubectl from tools
							sh "cp /usr/local/bin/kubectl ."
						}
					}
				}
			}
		}
		stage('Base build') {
			failFast true
			parallel {
				stage('Build frontend') {
					steps {
						script {
							dir(FOLDER) {
								// building frontend
								container('chrome') {
									sh "yarn install"
									sh "yarn build --base-href /console-devops/"
								}
							}
						}
					}
				}
				stage('Build backend') {
					steps {
						script {
							dir(FOLDER) {
								// building backend
								dir(BACKEND_FOLDER) {
									container('golang') { sh 'make build' }
									container('tools') { sh "upx dist/backend" }
								}
							}
						}
					}
				}
			}
		}
		stage('Copy') {
			steps {
				dir(FOLDER) {
					container('tools') {
						sh "mkdir -p dist || true "
						sh "cp ${BACKEND_FOLDER}/dist/backend dist"
						sh "cp ${BACKEND_FOLDER}/images/Dockerfile dist"
						sh "cp ${BACKEND_FOLDER}/images/frontendDockerfile dist"
					}
				}
			}
		}
		stage('CI'){
			failFast true
			parallel {
				stage('Build backend images') {
					steps {
						script {
							dir(FOLDER) {
								container('tools') {

									// currently is building code inside the container
									IMAGE = deploy.dockerBuild(
										"dist/Dockerfile", //Dockerfile
										"dist", // build context
										IMAGE_REPOSITORY, // repo address
										RELEASE_BUILD, // tag
										IMAGE_CREDENTIALS, // credentials for pushing
										)
									IMAGE.setArg("commit_id", "${release.commit}").setArg("app_version", RELEASE_BUILD)
									// start and push
									IMAGE.start().push()

									// currently is building code inside the container
									FRONTENDIMAGE = deploy.dockerBuild(
										"dist/frontendDockerfile", //Dockerfile
										"dist", // build context
										FRONT_IMAGE_REPOSITORY, // repo address
										RELEASE_BUILD, // tag
										IMAGE_CREDENTIALS, // credentials for pushing
										)
									FRONTENDIMAGE.setArg("commit_id", "${release.commit}").setArg("app_version", RELEASE_BUILD)
									// start and push
									FRONTENDIMAGE.start().push()

								}
							}
						}
					}
				}
				stage('Code Scan') {
					steps {
						script {
							dir(FOLDER) {
								// container('chrome') { sh "yarn test:ci" }
								dir(BACKEND_FOLDER) {
									container("golang") {
										try {
											// sh "make test-result"
											// sh "make cover-result"
										} catch (Exception exc) {
											// echo "error when running golang tests"
											// sh "make test-result-debug"
											// throw exc
										}
									}
								}
								// sh "echo 'sonar.projectVersion=${RELEASE_BUILD}' >> sonar-project.properties"
								container('tools') {
									deploy.scan(
										REPOSITORY,
										release.branch,
										SONARQUBE_BITBUCKET_CREDENTIALS,
										".",
										DEBUG,
										OWNER,
										BITBUCKET_FEEDBACK_ACCOUNT).start()
								}
							}
						}
					}
				}
			}
		}
		stage('Tag git') {
			when {
				expression { release.shouldTag() }
			}
			steps {
				script {
					dir(FOLDER) {
						container('tools') {
							deploy.gitTag(
								TAG_CREDENTIALS,
								RELEASE_BUILD,
								OWNER,
								REPOSITORY
								)
						}
					}
				}
			}
		}

		// stage('Chart Update') {
		// 	when {
		// 		expression { release.shouldUpdateChart() }
		// 	}
		// 	steps {
		// 		script {
		// 			deploy.triggerChart([
    //                 	chart: CHART_NAME,
    //                 	component: CHART_COMPONENT,
    //                 	version: RELEASE_VERSION,
    //                 	imageTag: RELEASE_BUILD,
    //                 	branch: release.chartBranch,
    //                 	prBranch: release.change["branch"],
    //                 	env: release.environment
    //                 ]).start()
		// 		}
		// 	}
		// }
		

	}
	// (optional)
	// happens at the end of the pipeline
	post {
		// 成功
		success {
			dir(FOLDER) {
				script {
					container('tools') {
						def msg = "流水线完成了"
						if (release.is_master) {
							msg = "上线啦！"
						}
						deploy.notificationSuccess(DEPLOYMENT, DINGDING_BOT, msg, RELEASE_BUILD)
						if (release != null) { release.cleanEnv() }
					}
				}
			}
		}
		// 失败
		failure {
			// check the npm log
			// fails lets check if it
			dir(FOLDER) {
				script {
					container('tools') {
						if (release != null && deployment != null) {
							release.setupTestEnv()
							deployment.rollbackConfig().apply()
						}
						deploy.notificationFailed(DEPLOYMENT, DINGDING_BOT, "流水线失败了", RELEASE_BUILD)
						if (release != null) { release.cleanEnv() }
					}
				}
			}
		}
	}
}


