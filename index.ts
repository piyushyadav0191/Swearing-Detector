import { Hono } from "hono";
import {cors} from "hono/cors"
import {env} from "hono/adapter"
import { Index } from "@upstash/vector";

const app = new Hono()

type Environment = {
  VECTOR_URL: string
  VECTOR_TOKEN: string
}

app.use(cors())

const WHITELIST =  ["swear"]

app.post("/", async (c) => {
  if(c.req.header("Content-Type") !== "application/json"){
    return c.json({error: "JSON body expected"}, {status: 406})
  }

  try {
    const {VECTOR_TOKEN,VECTOR_URL} = env<Environment>(c)
    const index = new Index({
      url: VECTOR_URL,
      token: VECTOR_TOKEN,
      cache: false
    })

    const body = await c.req.json()
    let {message} = body as {message: string}
    if(!message) {
      return c.json({error: "Message is required"}, {status: 400})
    }

    if(message.length >1000){
      return c.json({error: "Message can only at most 1000 characters"}, {status: 413})
    }

    message = message.split(/\s/).filter((word) => !WHITELIST.includes(word.toLocaleLowerCase())).join(" ")

    
    
  } catch (error) {
    
  }
})