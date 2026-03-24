The task is to create a web crawler that exposes two distinct capabilities. For the purposes of this exercise we can assume index is invoked before search, but we will be interested to hear your thoughts on how this system could be designed such that search can be invoked while the indexer is active. To the greatest extent possible please use language-native functionality rather than fully featured libraries that do the core work of the exercise out of the box.

index: Given a URL, initiate a web crawl to at most depth k, ensuring that you never crawl the same page twice. This method accepts two parameters, origin and k, where origin is a URL from which to initiate a web crawl and k is defined as the number of hops between origin and a newly discovered link. Please design around the assumption the scale of the crawl is very large but does not require multiple machines to run. The indexer should include some notion of back pressure — e.g. a maximum rate of work or queue depth — so the system can manage load in a controlled way.

search: Given a query, return all relevant URLs. This method accepts as input a string, query, and returns a list of triples, where each triple takes the form (relevant_url, origin_url, depth). relevant_url is the URL of an indexed web page relevant to query, and origin and depth define parameters passed to /index for which relevant_url was discovered. Search should be able to run while indexing is still active, reflecting new results as they are discovered. Feel free to make reasonable assumptions about the definition of relevancy for the purposes of this method.

In addition, provide a simple UI or CLI that makes it easy to:

initiate indexing and search,

view the state of the system (e.g. indexing progress, queue depth, back pressure status).

It is a plus (but not required) if the system can be resumed after interruption without starting from scratch.

Your work will be evaluated in terms of scalability, attention to detail, and overall architectural sensibility. Given the timeframe for this project (3–5 hours) we prefer to see thoughtfully crafted code that works within a reasonable set of assumptions rather than an expansive, half-realized vision for what might be.

With your submission, please include a brief written description (1–2 paragraphs tops) of your recommendations for next steps for deploying this crawler into a production environment.

Feel free to reach out with any questions, and we look forward to seeing what you build!

—

Technology Options

Project should be run on localhost (including DB)

IDE / CLI to be used

VS Code

Claude Code

Cursor

Chatgpt Codex

Github

Output

PRD - for AI to build the project

Github repository

Readme - how the project works (not for AI) (readme.md)

PRD - inside github project (product_prd.md)

Recommendation - inside github project (recommendation.md)

Localhost runnable

Example Outputs:

https://github.com/ereneld/crawler

[Demo Video 1](https://www.loom.com/share/0269ade6dd31443fa6e0ec6fffd7fcbf?sid=3c09e1f6-3067-42e1-9871-c8dc6e10d6a1)

[Demo Video 2 (continuation due to 5 min limit)](https://www.loom.com/share/3703f02ce5a649839e04f783eea4b914?sid=d99bd7b6-40b7-4786-b93c-f214ecc72376)

[Project Document](https://docs.google.com/document/d/1jzZUHh4PwDpzXe7ZVSmGqUpqV4wcqhBwD2JuOXx76_Q/edit?tab=t.0#heading=h.58siijkdbahk)
