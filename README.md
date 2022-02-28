# Argo.js
A lightweight Node.js module for Argo / DidUP electronic register 📚

## Table Of Contents
  - [Installation](#installation)
  - [Example](#example)

## Installation

```sh
    npm install argo.js
```

## Example

```javascript
    const { Argo } = require('argo.js');

    const argo = new Argo('SCHOOL CODE', 'USERNAME', 'PASSWORD');

    (async () => {
        const user = await argo.login();
        console.log(`${user.name} - ${user.surname} (${user.id})`);

        argo.getAbsences()
        .then(absences => {
            console.log(`You were absent in school ${absences.length} times`);
        });

        setTimeout(() => {
            argo.logout();
            process.exit();
        }, 3500);
    })();
```