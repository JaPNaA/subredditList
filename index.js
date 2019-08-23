/**
 * @typedef { { dist: number, after: string, done: boolean } } StateData
 */

const SOURCE_URL = "https://www.reddit.com/subreddits/new.json";
const CURRENT_STATE_FILE = "./data/state.txt";
const NEW_SUBREDDITS_FILE = "./data/new-subreddits.txt";
const FINAL_SUBREDDITS_FILE = "./data/subreddits.txt";

const https = require("https");
const fs = require("fs");

const newSubredditsWriteStream = fs.createWriteStream(NEW_SUBREDDITS_FILE, { flags: "a" });

/** @type {string | undefined} */
let newestSubreddit;

let currentCount = 0;

async function main() {
    let data = getState();
    newestSubreddit = await getLastWrittenSubreddit();

    if (newestSubreddit) {
        console.log("Fetching until " + newestSubreddit);
    }

    do {
        data = await newExtractDataRequestAfter(SOURCE_URL, data);
        updateState(data);
    } while (!data.done);

    newSubredditsWriteStream.close();
    fs.unlinkSync(CURRENT_STATE_FILE);

    const newSubreddits = fs.readFileSync(NEW_SUBREDDITS_FILE).toString().split("\n");
    const subredditWriteStream = fs.createWriteStream(FINAL_SUBREDDITS_FILE, { flags: "a" });

    for (let i = newSubreddits.length - 1; i >= 0; i--) {
        if (newSubreddits[i]) {
            subredditWriteStream.write(newSubreddits[i] + "\n");
        }
    }

    fs.unlinkSync(NEW_SUBREDDITS_FILE);

    console.log("Done!");
}

/**
 * Makes a request
 * @param {string} url
 * @param {StateData} [prevData]
 * @returns {Promise<StateData>}
 */
function newExtractDataRequestAfter(url, prevData) {
    if (prevData) {
        currentCount += prevData.dist;
        return extractDataFrom(url + "?limit=2000&count=" + currentCount + "&after=" + prevData.after);
    } else {
        return extractDataFrom(url + "?limit=2000");
    }
}

/**
 *
 * @param {string} url
 * @returns {Promise<StateData>}
 */
async function extractDataFrom(url) {
    let response;
    let currTime = 100;
    let done = false;

    for (; ;) {
        try {
            response = await fetch(url);
            break;
        } catch (err) {
            await wait(currTime);
            currTime *= 2;
            currTime = Math.min(currTime, 60000);
        }
    }

    for (const listing of response.data.children) {
        const match = listing.data.url.match(/\/r\/(.+)\//);
        let subreddit;
        if (match) {
            subreddit = match[1];
        } else {
            // some subreddit links seem to be bugged, and don't follow the pattern /r/*subreddit*/
            subreddit = listing.data.url;
        }

        if (subreddit === newestSubreddit) {
            done = true;
            break;
        }

        newSubredditsWriteStream.write(subreddit + "\n");
    }

    return {
        dist: response.data.dist,
        after: response.data.after,
        done: !response.data.after || done
    };
}

/**
 * @param {StateData} data
 */
function updateState(data) {
    const contents = currentCount + ":" + JSON.stringify(data);
    fs.writeFile(CURRENT_STATE_FILE, contents, err => {
        if (err) {
            console.warn("[WARN] Failed to write state file.\n" + contents);
        }
    });
}

function getState() {
    let str;

    try {
        str = fs.readFileSync(CURRENT_STATE_FILE).toString();
    } catch (err) {
        return;
    }

    const colonIndex = str.indexOf(":");
    const strCurrentCount = str.slice(0, colonIndex);
    const strStateData = str.slice(colonIndex + 1);

    currentCount = parseInt(strCurrentCount);

    if (isNaN(currentCount)) { throw new Error("Current count is NaN"); }

    return JSON.parse(strStateData);
}

async function getLastWrittenSubreddit() {
    return new Promise((res, rej) => {
        let stream;
        try {
            stream = fs.createReadStream(FINAL_SUBREDDITS_FILE);
        } catch (err) {
            return;
        }

        /** @type {Buffer[]} */
        let chunks = [];

        stream.on("data", function (chunk) {
            chunks.push(chunk);
        });

        stream.on("end", function () {
            /** @type {string} */
            let str = chunks[chunks.length - 1].toString();
            if (str.split("\n").length <= 2) {
                str = chunks[chunks.length - 1] + str;
            }
            
            const subs = str.split("\n");
            
            for (let i = subs.length; i >= 0; i--) {
                if (subs[i]) {
                    res(subs[i]);
                    return;
                }
            }

            throw new Error("unreachable");
        });

        stream.on("error", function (err) {
            rej(err);
        });
    });
}

/**
 * Makes an HTTPS request
 * @param {string} url
 * @returns {Promise<any>}
 */
function fetch(url) {
    console.log("fetch: " + url);
    return new Promise((resolve, reject) => https.get(url, resStream => {
        let body = "";

        resStream.on("data", chunk => body += chunk);

        resStream.on("end", () => {
            try {
                const response = JSON.parse(body);
                resolve(response);
            } catch (err) {
                console.log(body);
                reject(err);
            }
        });

        resStream.on("error", err => reject(err));
    }));
}

/**
 * @param {number} ms
 */
function wait(ms) {
    return new Promise(res => setTimeout(() => res(), ms));
}

main();
