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

## Contributing

If you update the list with `npm start`, please submit a pull request with the updated `subreddits.txt` file.

## Known Dupes

`Dupe: Redskins on line 1832177 and line 17759`

The cause seems to be due to a subreddit rename.

See https://www.reddit.com/r/Redskins/comments/i33r2q/we_have_a_new_home/

A large number of dupes beginning at 4de3b1d12c643c0ee88374463f80706ac789ca97. The list has be reverted to before that commit.

