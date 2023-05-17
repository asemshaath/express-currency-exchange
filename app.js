const express = require("express"); /* Accessing express module */
const path = require('path');
const bodyParser = require('body-parser');
const fs = require("fs");
const { request } = require("http");
const { url } = require("inspector");
require("dotenv").config({ path: path.resolve(__dirname, './.env') }) 

const userName = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;

/* Our database and collection */
const databaseAndCollection = {db: process.env.MONGO_DB_NAME, collection:process.env.MONGO_COLLECTION};
const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${userName}:${password}@cluster0.8qmpvyv.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const portNumber = 3000;
let fromTo = 0;

const app = express(); /* app is a request handler function */

/* directory where templates will reside */
app.set("views", path.resolve(__dirname, "templates"));

/* view/templating engine */
app.set("view engine", "ejs");

// Activate reading user input from forms
app.use(bodyParser.urlencoded({extended:false}));


async function insertItem(client, databaseAndCollection, newItem) {
    const result = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(newItem);

    console.log(`Item entry created with id ${result.insertedId}`);
}

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (request, response) => { 
    console.log(fromTo);
    response.render("index");
});

app.get("/exchange", (request, response) => { 
    response.render("exchange");
});

app.post("/exchange", async (request, response) => { 

    
    await fetchCurrency(request.body.inputCurrency, request.body.outputCurrency);
    let res = fromTo * Number(request.body.amount);
    
    let inputForm = {
        name: request.body.name, 
        email: request.body.email, 
        inputAmount: request.body.amount,
        inputCurrency: request.body.inputCurrency,
        outputAmount: res,
        outputCurrency: request.body.outputCurrency,
    };    

    try {
        await client.connect();
        await insertItem(client, databaseAndCollection, inputForm);
        response.render("processExchange", inputForm);
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }


});


app.get("/records", (request, response) => { 
    response.render("records");
});

app.post("/records", async (request, response) => {

    try {
        await client.connect();
        let filter = {
            email: request.body.email,
            inputCurrency: request.body.inputCurrency.toUpperCase(),
            outputCurrency: request.body.outputCurrency.toUpperCase(),
        };
        
        if(filter.email === "") {
            delete filter.email;
        }
        
        switch(filter.inputCurrency) {
            case "AUSTRALIAN DOLLAR":
                filter.inputCurrency = "AUD";
                break;
            case "CANADIAN DOLLAR":
                filter.inputCurrency = "CAD";
                break;
            case "CHINESE YUAN":
                filter.inputCurrency = "CNY";
                break;
            case "EURO":
                filter.inputCurrency = "EUR";
                break;
            case "INDIAN RUPEE":
                filter.inputCurrency = "INR";
                break;
            case "JAPANESE YEN":
                filter.inputCurrency = "JPY";
                break;
            case "SOUTH KOREAN WON":
                filter.inputCurrency = "KRW";
                break;
            case "MEXICAN PESO":
                filter.inputCurrency = "MXN";
                break;
            case "RUSSIAN RUBLE":
                filter.inputCurrency = "RUB";
                break;
            case "UNITED STATES DOLLAR":
                filter.inputCurrency = "USD";
                break;
            case "":
                delete filter.inputCurrency;
                break;
        }
        
        switch(filter.outputCurrency) {
            case "AUSTRALIAN DOLLAR":
                filter.outputCurrency = "AUD";
                break;
            case "CANADIAN DOLLAR":
                filter.outputCurrency = "CAD";
                break;
            case "CHINESE YUAN":
                filter.outputCurrency = "CNY";
                break;
            case "EURO":
                filter.outputCurrency = "EUR";
                break;
            case "INDIAN RUPEE":
                filter.outputCurrency = "INR";
                break;
            case "JAPANESE YEN":
                filter.outputCurrency = "JPY";
                break;
            case "SOUTH KOREAN WON":
                filter.outputCurrency = "KRW";
                break;
            case "MEXICAN PESO":
                filter.outputCurrency = "MXN";
                break;
            case "RUSSIAN RUBLE":
                filter.outputCurrency = "RUB";
                break;
            case "UNITED STATES DOLLAR":
                filter.outputCurrency = "USD";
                break;
            case "":
                delete filter.outputCurrency;
                break;
        }
        
        let htmlTable = "";
        const cursor = client.db(databaseAndCollection.db)
        .collection(databaseAndCollection.collection)
        .find(filter);

        const result = await cursor.toArray();

        result.forEach(item =>{
            htmlTable += `<tr> <td>${item.name}</td> <td>${item.email}</td> <td>${item.inputAmount} ${item.inputCurrency}</td> <td>${item.outputAmount} ${item.outputCurrency}</td> </tr>`;
        });

        // htmlTable += "<table/>"
        response.render("processRecords", {records: htmlTable});
    
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }


});

app.get("/delete", (request, response) => { 
    response.render("delete");
});

app.post("/delete", async (request, response) => {
    try {
        await client.connect();
        const emails = request.body.email;
        const filter = (emails === "") ? {} : {email: emails};
        let names = "";
        const cursor = client.db(databaseAndCollection.db)
        .collection(databaseAndCollection.collection)
        .find(filter);
        
        let result = await cursor.toArray();
        
        result.forEach((item, i, arr) =>{
            if(i === 0) {
                names += `${item.name}`;
            }
            else if(i === arr.length - 1) {
                names += ` and ${item.name}`;
            }
            else {
                names += `, ${item.name}`;
            }
        });
        
        result = await client.db(databaseAndCollection.db)
        .collection(databaseAndCollection.collection)
        .deleteMany(filter);
        
        response.render("processDelete", {name: names});
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
    
});


async function fetchCurrency(from, to){
    const url = `https://currency-exchange.p.rapidapi.com/exchange?from=${from}&to=${to}`;
    const options = {
        method: 'GET',
        headers: {
            'X-RapidAPI-Key': process.env.API_KEY,
            'X-RapidAPI-Host': process.env.API_HOST,
        }
    };
    // console.log("Fetch invoked");
    try {
        const response = await fetch(url, options);
        const text = await response.text();
        fromTo = Number(text);
    } catch (error) {
        console.error(error);
    }

}

app.listen(portNumber);
console.log(`Web server started running at http://localhost:${portNumber}`);
