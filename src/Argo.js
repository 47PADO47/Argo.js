const fetch = require('node-fetch');
const { readFileSync, writeFileSync } = require('fs');

class Argo {
    #password = "";
    #token = null;
    #headers = {};
    constructor(school_code, username, password) {
        this.school_code = school_code;
        this.username = username;
        this.#password = password;

        this.directory = require('path').parse(__dirname).dir;
        this.base_url = `https://www.portaleargo.it/famiglia/api/rest`;
        this.version = "2.5.4";

        this.authorized = false;
        this.#token = null;
        this.user = {};

        this.last_update = "";

        this.maxRows = 100;
        this.#headers = {
            "x-key-app": "ax6542sdru3217t4eesd9",
            "x-version": this.version,
            "x-produttore-software": "ARGO Software s.r.l. - Ragusa",
            "x-app-code": "APF",
            "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
            "x-cod-min": school_code,
            "x-max-return-record": this.maxRows
        };
    };

    async login(school_code = this.school_code, username = this.username, password = this.#password) {

        if(this.authorized) return this.#log("Already logged in ❌");

        const token = await this.#getToken(school_code, username, password);
        if(!token) return this.#log("Could not login ❌");

        const userData = await this.#getUserData(token);
        if(!userData) return this.#log("Could not login ❌");
        
        const newData = this.#updateData(userData);
        if (!newData) return this.#log("Could not login (Data not updated) ❌");

        writeFileSync(`${this.directory}/argo.json`, JSON.stringify({ token, user: this.user, last_update: this.last_update }, null, 2));

        if (!this.authorized) {
            this.#log("Could not login ❌");
            return false; 
        };
        
        this.#log(`Successfully logged in as "${this.user?.name} ${this.user?.surname}" ✅`);
        return this.user;
    };

    async logout() {
        if(!this.authorized) {
            this.#log("Already logged out ❌");
            return false;
        };

        this.authorized = false;
        this.#token = "";
        this.user = {};
        this.last_update = "";
        
        this.#log("Logout successful ✅");
        return true;
    };

    async getStatus() {
        const data = await this.#fetch("verifica");
        return data ?? {};
    };

    async getToday(date) {
        const data = await this.#fetch("oggi", null, date);
        return data?.dati ?? [];
    };

    async getAbsences() {
        const data = await this.#fetch("assenze");
        return data?.dati ?? [];
    };

    async getTodayGrades() {
        const data = await this.#fetch("votigiornalieri");
        return data?.dati ?? [];
    };

    async getNotes() {
        const data = await this.#fetch("notedisciplinari");
        return data?.dati ?? [];
    };

    async getPeriods() {
        const data = await this.#fetch("periodiclasse");
        return data?.dati ?? [];
    };

    async getFinalGrades() {
        const data = await this.#fetch("votiscrutinio");
        return data ?? [];
    };

    async getHomework() {
        const data = await this.#fetch("compiti");
        return data?.dati ?? [];
    };

    async getLessonsInfo() {
        const data = await this.#fetch("argomenti");
        return data?.dati ?? [];
    };

    async getReminders() {
        const data = await this.#fetch("promemoria");
        return data?.dati ?? [];
    };

    async getSchedule() {
        const data = await this.#fetch("orario");
        return data?.dati ?? [];
    };

    async getTalks() {
        const data = await this.#fetch("prenotazioniricevimento");
        return data ?? [];
    };

    async getTeachers() {
        const data = await this.#fetch("docenticlasse");
        return data ?? [];
    };

    async getNoticeboard() {
        const data = await this.#fetch("bachecanuova");
        return data?.dati ?? [];
    };

    async getDidactics() {
        const data = await this.#fetch("bachecaalunno");
        return data?.dati ?? [];
    };

    async getSharedFiles() {
        const data = await this.#fetch("condivisionefile");
        return data?.dati ?? [];
    };

    async getBSmart() {
        const data = await this.#fetch("bsmart");
        return data ?? {};
    };

    setMaxRows(rows = 100) {
        this.maxRows = rows;
        this.#headers["x-max-return-record"] = rows;
    };

    async #fetch(path = '/', method = "GET", day) {
        if (!this.authorized || !this.#token) return this.#log("Not logged in ❌");
        const headers = Object.assign({ 
            "x-auth-token": this.#token,
            "x-prg-alunno": this.user?.id,
            "x-prg-scheda": this.user?.school?.scheda || 1,
            "x-prg-scuola": this.user?.school?.id || 1,
        }, this.#headers);

        const date = new Date(day);
        const dateString = day ? `&datGiorno=${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}` : "";

        const response = await fetch(`${this.base_url}/${path}?_dc=${Date.now().toString()}${dateString}&page=1&start=0&limit=25`, {
            method,
            headers,
        });

        const json = await response.json()
        .catch((e) => this.#log(`Error while parsing json at /${path} ❌`));

        if (response.status != 200) return this.#log(`Error while fetching /${path} (${response.status}) ❌`);
        return json;
    };

    #updateData(data) {
        if (!data) return this.logout();

        if (typeof data === "object") {
            const { alunno, abilitazioni, annoScolastico } = data[0];
            this.authorized = true;
            this.user = {
                name: alunno.desNome || "",
                surname: alunno.desCognome || "",
                citizenship: alunno.desCittadinanza || "",
                sex: alunno.flgSesso || "",
                fiscalCode: alunno.desCf || "",
                id: data[0].prgAlunno || "",
                phone: {
                    mobile: alunno.desCellulare || "",
                    home: alunno.desTelefono || "",
                },
                birth: {
                    place: alunno.desComuneNascita || "",
                    date: alunno.datNascita || "",
                },
                residence: {
                    address: alunno.desVia || "",
                    municipality: alunno.desComuneResidenza || "",
                    cap: alunno.desCapResidenza || "",
                    deliveryMunicipality: alunno.desComuneRecapito || "",
                    delivery: alunno.desIndirizzoRecapito || "",
                },
                school: {
                    code: data[0].codMin || "",
                    branch: data[0].desSede || "",
                    name: data[0].desScuola || "",
                    course: data[0].desCorso || "",
                    class: data[0].desDenominazione || "",
                    classId: data[0].prgClasse || "",
                    scheda: data[0].prgScheda || 1,
                    id: data[0].prgScuola || 1,
                },
                annoScolastico,
                abilitazioni,
            };
        this.last_update = Date.now();
            return true;
        } else return false;

    };

    async #getUserData(token = this.#token) {
        const headers = Object.assign({ "x-auth-token": token }, this.#headers);

        const response = await fetch(`${this.base_url}/schede?_dc=${(Date.now()*1000).toFixed()}`, {
            headers
        });

        if(response.status != 200) {
            this.#log("Error getting user data ❌");
            return false;
        };

        const json = await response.json()
        .catch(async (e) => {
            return this.#log("Error while parsing JSON ❌");
        });

        if (!json) return this.#log(`No data avaible on user data (${response.status}) ❌`);
        if (json.errCode) return this.#log(`Error: ${json.value} ❌ (${json.errCode})`);
        
        return json;
    };
    
    async #getToken(school_code = this.school_code, username = this.username, password = this.#password) {
        this.#headers["x-cod-min"] = school_code;
        const headers = Object.assign({ 
            "x-user-id": username,
            "x-pwd": password,
        }, this.#headers);

        const response = await fetch(`${this.base_url}/login?_dc=${Date.now().toFixed()}`, {
            headers
        });

        if(response.status != 200) {
            this.#log("Error getting token ❌");
            return false;
        };

        const json = await response.json()
        .catch(async (e) => {
            return this.#log("Error while parsing JSON ❌");
        });

        if (!json) return this.#log(`No data avaible on login (${response.status}) ❌`);
        if (json.errCode) return this.#log(`Error: ${json.value} ❌ (${json.errCode})`);
        
        this.#token = json.token;
        return this.#token;
    };

    #log(...args) {
        console.log(`\x1b[36m[ARGO]\x1b[0m`, ...args);
    };
};

module.exports = Argo;