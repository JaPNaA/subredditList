# SubredditList

[A list of all the subreddits](data/subreddits.txt), and a program that generates all the subreddits.

---

[`subreddits.txt`](data/subreddits.txt) is a file containing all the subreddits from reddit.com/subreddits/new

The file is sorted in chronological order, with the oldest first.

Running for the first time without `subreddits.txt` will cause the program to go until the first subreddit

Running it after it finishes will cause the program to update the `subreddits.txt` list, and only fetch until it finds the last subreddit in the list.

---

\*note: the first 24 lines of [data/subreddits.txt](data/subreddits.txt) was entered manually.

<small> It bugged out on the last page, and I'm not going to debug a program that takes hours to run </small>