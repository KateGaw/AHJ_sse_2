/* eslint-disable no-unused-vars */
/* eslint-disable no-return-await */
/* eslint-disable consistent-return */
/* eslint-disable no-shadow */

const http = require("http");
const Koa = require("koa");
const Router = require("koa-router");
const koaBody = require("koa-body");
const uuid = require("uuid");
const WS = require("ws");

const app = new Koa();

const router = new Router({
    prefix: "/users",
});
const server = http.createServer(app.callback());
const wsServer = new WS.Server({ server });

// CORS
app.use(async(ctx, next) => {
    const origin = ctx.request.get("Origin");
    if (!origin) {
        return await next();
    }
    const headers = { "Access-Control-Allow-Origin": "*" };
    if (ctx.request.method !== "OPTIONS") {
        ctx.response.set({...headers });
        try {
            return await next();
        } catch (e) {
            e.headers = {...e.headers, ...headers };
            throw e;
        }
    }
    if (ctx.request.get("Access-Control-Request-Method")) {
        ctx.response.set({
            ...headers,
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH",
        });
        if (ctx.request.get("Access-Control-Request-Headers")) {
            ctx.response.set(
                "Access-Control-Allow-Headers",
                ctx.request.get("Access-Control-Request-Headers")
            );
        }
        ctx.response.status = 204;
    }
});

app.use(
    koaBody({
        text: true,
        urlencoded: true,
        multipart: true,
        json: true,
    })
);

const clients = [];

router
    .get("/", async(ctx, next) => {
        console.log("get");
        ctx.response.body = clients;
    })
    .post("/", async(ctx, next) => {
        console.log("post");
        clients.push({...ctx.request.body, id: uuid.v4() });
        ctx.response.status = 204;
    })
    .delete('/:name', async(ctx, next) => {
        console.log('DELETE!!!' + ctx.params.name);
        const index = clients.findIndex(({ name }) => name === ctx.params.name);
        if (index !== -1) {
            clients.splice(index, 1);
        }
        ctx.response.status = 204;
    });

wsServer.on("connection", (ws, req) => {
    console.log("connection");
    ws.on("message", (mess) => {
        console.log("mess");
        [...wsServer.clients]
        .filter((o) => o.readyState === WS.OPEN)
            .forEach((o) => o.send(mess));
    });

    ws.on("close", (mess) => {
        console.log("close -> deleting");
        [...wsServer.clients]
        .filter((o) => o.readyState === WS.OPEN)
            .forEach((o) => o.send(JSON.stringify({ type: "deleting" })));
        ws.close();
    });

    [...wsServer.clients]
    .filter((o) => o.readyState === WS.OPEN)
        .forEach((o) => o.send(JSON.stringify({ type: "adding" })));
});

app.use(router.routes()).use(router.allowedMethods());
const port = process.env.PORT || 7070;
server.listen(port);