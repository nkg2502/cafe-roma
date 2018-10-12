/**
 * Copyright 2017 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Import the Firebase SDK for Google Cloud Functions.
const functions = require('firebase-functions');
// Import and initialize the Firebase Admin SDK.
const admin = require('firebase-admin');
admin.initializeApp();

const moment = require('moment-timezone');
const dbName = 'cafe/' + moment().tz('America/Los_Angeles').format('YYYYMMDD') + '/orderList';
const db = admin.database().ref(dbName);
const orderDb = function (id) {
    return admin.database().ref(dbName + '/' + id);
};

const express = require('express')
const bodyParser = require('body-parser');
const bot = express();

bot.use(bodyParser.json());

const keyboard = {
    "type": "buttons",
    "buttons": [
        "Find My Order",
        "Check All",
        "Go to Cafe770"
    ]
};

bot.get('/keyboard', (req, res) => {
    res.set('Content-Type', 'application/json; charset=utf-8');
    res.status(200).send(JSON.stringify(keyboard));
});

bot.post('/message', (req, res) => {
    switch (req.body.content) {
        case 'Check All':
        case 'Find My Order': // need to split
            const predicate = (req.body.content === 'Check All') ? (e => e) : (e => e && !e.time.end);

            db.once('value').then(allOrderList => {
                const orderList = allOrderList.val() || [];

                const keyboardList = orderList.reverse().filter(predicate).map((order) => {
                    const quantity = order.order.reduce((sum, q) => {
                        sum[0] += q.quantity;
                        if (q.state === 'done' || q.state === 'cancel')
                            sum[1] += q.quantity;
                        return sum;
                    }, [0, 0]);
                    return (!!order.time.end ? '[Done] ' : '') + 'Order ' + order.id + ' *' + order.name + '* (' + quantity[1] + ' of ' + quantity[0] + ')';
                });

                res.set('Content-Type', 'application/json; charset=utf-8');
                res.status(200).send(JSON.stringify({
                    "message": {
                        "text": orderList.length ? "Please select an order" : 'Nothing.'
                    },
                    keyboard: {
                        "type": "buttons",
                        "buttons": keyboardList.concat(keyboard.buttons)
                    }
                }));
            });
            break;
        case 'Go to Cafe770':
            res.status(200).send(JSON.stringify({
              "message": {
                "message_button": {
                  "label": "cafe770.org",
                  "url": "https://cafe770.org"
                 }
               },
              "keyboard": keyboard
            }));
            break;
        default:
            if (!req.body.content) {
                res.set('Content-Type', 'application/json; charset=utf-8');
                res.status(200).send(JSON.stringify({
                    "message": {
                        "text": JSON.stringify(req.body),
                    },
                    "keyboard": keyboard
                }));
            } else if (req.body.content.startsWith('[Done]')) {
                const id = req.body.content.split(' ')[2];
                orderDb(id).once('value').then(eachOrderList => {
                    const orderItem = eachOrderList.val();
                    const t = orderItem.order.map((i) => '(' + i.quantity + ') ' + (i.isIced ? 'Iced ' : 'Hot ') + i.menu + '/' + i.option + ' [' + i.state + ']');
                    const quantity = orderItem.order.reduce((sum, q) => {
                        sum[0] += q.quantity;
                        if (q.state === 'done' || q.state === 'cancel')
                            sum[1] += q.quantity;
                        return sum;
                    }, [0, 0]);

                    const text = 'Order #' + orderItem.id + '\n*'  + orderItem.name + '*\n' + quantity[1] + ' of ' + quantity[0] + '\n' + t.join('\n');  

                    res.set('Content-Type', 'application/json; charset=utf-8');
                    res.status(200).send(JSON.stringify({
                        "message": {
                            "text": text
                        },
                        "keyboard": keyboard
                    }));
                });
            } else if (req.body.content.startsWith('Order')) {
                const id = req.body.content.split(' ')[1];
                orderDb(id).once('value').then(eachOrderList => {
                    const orderItem = eachOrderList.val();
                    const t = orderItem.order.map((i) => '(' + i.quantity + ') ' + (i.isIced ? 'Iced ' : 'Hot ') + i.menu + '/' + i.option + ' [' + i.state + ']');
                    const quantity = orderItem.order.reduce((sum, q) => {
                        sum[0] += q.quantity;
                        if (q.state === 'done' || q.state === 'cancel')
                            sum[1] += q.quantity;
                        return sum;
                    }, [0, 0]);

                    const text = 'Order #' + orderItem.id + '\n*'  + orderItem.name + '*\n' + quantity[1] + ' of ' + quantity[0] + '\n' + t.join('\n');  

                    res.set('Content-Type', 'application/json; charset=utf-8');
                    res.status(200).send(JSON.stringify({
                        "message": {
                            "text": text
                        },
                        "keyboard": keyboard
                    }));
                });
            } else {
                res.set('Content-Type', 'application/json; charset=utf-8');
                res.status(200).send(JSON.stringify({
                    "message": {
                        "text": 'Back to start',
                    },
                    "keyboard": keyboard
                }));
            }
            break;
    }
});

const kakaotalk = express();
kakaotalk.use('/kakaotalk', bot);

exports.kakaotalk = functions.https.onRequest(kakaotalk);
