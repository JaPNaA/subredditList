/**
 * @typedef { { dist: number, after: string, done: boolean } } StateData
 */

const SOURCE_URL = "https://www.reddit.com/subreddits/new.json";
const CURRENT_STATE_FILE = "./data/state.txt";
const NEW_SUBREDDITS_FILE = "./data/new-subreddits.txt";
const FINAL_SUBREDDITS_FILE = "./data/subreddits.txt";
const NEWEST_SUBREDDIT_SET_SIZE = 20;

const https = require("https");
const fs = require("fs");

const newSubredditsWriteStream = fs.createWriteStream(NEW_SUBREDDITS_FILE, { flags: "a" });

/** @type {Set<string> | undefined} */
let newestSubreddits;

let currentCount = 0;

async function main() {
    let data = getState();
    newestSubreddits = await createNewestSubredditsSet();

    if (newestSubreddits.size > 0) {
        console.log("Fetching until " + newestSubreddits.values().next().value);
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

        if (newestSubreddits.has(subreddit)) {
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

/**
 * @returns {Promise<Set<string>>}
 */
async function createNewestSubredditsSet() {
    return new Promise((res, rej) => {
        let stream;
        try {
            stream = fs.createReadStream(FINAL_SUBREDDITS_FILE);
        } catch (err) {
            return;
        }

        let body = "";

        stream.on("data", function (chunk) {
            body += chunk;
        });

        stream.on("end", function () {
            const subs = getTail(body, NEWEST_SUBREDDIT_SET_SIZE);
            const set = new Set();

            for (const sub of subs) {
                set.add(sub);
            }

            res(set);
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
 * @param {string} str 
 * @param {number} n number of lines
 * @returns {string[]} tail lines
 */
function getTail(str, n) {
    const arr = [];
    let lastIndex = str.length;

    for (let i = 0; i < n && lastIndex > 0;) {
        const currIndex = str.lastIndexOf("\n", lastIndex - 1);
        const slicedStr = str.slice(currIndex + 1, lastIndex);
        if (slicedStr) {
            arr.push(slicedStr);
            i++;
        }
        lastIndex = currIndex;
    }

    return arr;
}

/**
 * @param {number} ms
 */
function wait(ms) {
    return new Promise(res => setTimeout(() => res(), ms));
}

main();
