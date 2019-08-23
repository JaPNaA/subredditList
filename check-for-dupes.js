const fs = require("fs");
const subreddits = fs.readFileSync("./data/subreddits.txt").toString().split("\n");
const set = new Set();
const map = new Map();

let hasDupe = false;

for (let i = 0, length = subreddits.length; i < length; i++) {
    const subreddit = subreddits[i];

    if (set.has(subreddit)) {
        console.error("Dupe: " + subreddit + " on line " + i + " and line " + map.get(subreddit));
        hasDupe = true;
    }

    set.add(subreddit);
    map.set(subreddit, i);
}

if (!hasDupe) {
    console.log("Looks good!");
}