# DSB Client

A module which uses my [dsbapi library](https://github.com/TheNoim/DSBAPI) to filter only for the important information returned by the [getData()](https://github.com/TheNoim/DSBAPI#DSB+getData) Method.

### Filters for: 

- timetable 
- news 
- tiles

### Install
```bash
yarn add dsbclient
# OR
npm install dsbclient --save
``` 

### Usage:

```javascript
import Client from 'dsbclient';
const client = new Client(USERNAME, PASSWORD);

client.fetch() => Returns Promise

```