import * as https from "https";
import {FailedTest, TestResults} from "./types";
import {IncomingWebhookSendArguments} from "./slackTypes";

export default function (testResults: TestResults, optionalProcessing?: (testResults: TestResults) => IncomingWebhookSendArguments) {
    const {WEBHOOK_URL: webhookUrl} = process.env;
    if (!webhookUrl) {
        throw new Error("Please provide a Slack webhookUrl field as an env variable");
    }

    const testData = testResults.testResults;

    let failedTests: Array<FailedTest> = [];

    testData.filter((item) => {
        item.testResults.filter((test) => {
            return test.status === "failed" ? failedTests.push({
                "color": "#ff0000",
                "title": test.fullName,
                "fields": [
                    {
                        "value": 'Failed',
                        "short": false
                    }
                ],
            }) : null;
        });
    });

    const errText = `
    *${testResults.numFailedTests}* ${testResults.numFailedTests > 1 ? 'tests have' : 'test has'} failed. Please take a look. 
  `;

    const passingText = `All *${testResults.numTotalTests}* tests have passed :thumbsup:`;

    const text = testResults.numFailedTests > 0 ? errText : passingText;


    const data = JSON.stringify({
        'text': text,
        'attachments': failedTests.length > 0 ? failedTests : [{ "color": "#00ff00", "title": 'No Errors',}]
    })

    const options = {
        hostname: webhookUrl,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    const req = https.request(options, res => {
        console.log(`statusCode: ${res.statusCode}`)

        res.on('data', d => {
            process.stdout.write(d)
        })
    })

    req.on('error', error => {
        console.error(error)
    })

    if(optionalProcessing){
        req.write(JSON.stringify(optionalProcessing(testResults)))
    } else {
        req.write(data)
    }

    req.end()

    return testResults;
};
