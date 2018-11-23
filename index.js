const express = require('express');
const bodyParser = require('body-parser');
const dialogflow = require('dialogflow-fulfillment');
const rp = require('request-promise');
const moment = require('moment');
const app = express();
const port = 80;

const WebhookClient = dialogflow.WebhookClient;
const io = require('socket.io-client');
const socket = io('http://127.0.0.1:4001');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

var pool = [];
var last = moment();

app.post('/webhook', async (request, response) => {
    const agent = new WebhookClient({
        request,
        response
    });

    function welcome(agent) {
        agent.add(`Welcome to my agent!`);
    }

    function fallback(agent) {
        agent.add(`I didn't understand`);
        agent.add(`I'm sorry, can you try again?`);
    }

    function pooltable(agent) {
        let lastInUse = moment().diff(last, 'minutes');

        console.log(lastInUse);
        if (lastInUse >= 1){
            agent.add(`Looks like the pool table is free! Get down there now :)`);
        } else {
            agent.add(`Oh no :( Looks like someone is using the pool table. Last checked ${lastInUse} minute(s) ago`);
        }
    }

    async function predictUsage(agent) {
        console.log(agent.parameters);
        var options = {
            method: 'POST',
            uri: 'https://f19f9809.ngrok.io',
            body: {
                day: agent.parameters.dayOfWeek,
                time: agent.parameters.timeOfDay,
                availability: true
            },
            json: true // Automatically stringifies the body to JSON
        };
        var data = await rp(options)
            .then(function (parsedBody) {
                parsedBody *= 100;
                console.log(parsedBody);
                return parsedBody;
            })
            .catch(function (err) {
                console.log(err);
                return 0;
            });
        agent.add(`According to my calculations... there is a ${data}% chance that the pool table is free.`)
    }

    let intentMap = new Map();
    intentMap.set('Default Welcome Intent', welcome);
    intentMap.set('Default Fallback Intent', fallback);
    intentMap.set('pooltable', pooltable);
    intentMap.set('pooltable.predict', predictUsage);

    agent.handleRequest(intentMap);
});

socket.on("test", data => {
    pool.push(data.includes('detected'));
    if (data.includes('detected')) {
        last = moment();
    }

    console.log(data);
    console.log(pool);
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`))