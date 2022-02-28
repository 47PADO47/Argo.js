import fetch, { HeadersInit, Response } from 'node-fetch';
import path from 'path';
import { User, Headers } from './struct';

class Argo {
    public readonly school_code: string | number;
    public readonly username: string;
    private readonly password: string;

    private readonly directory: string;
    private readonly base_url: string;
    private readonly api_version: string;

    public authorized: boolean;
    private token: string;
    public user: User = {};

    public last_update: undefined | number;
    public maxRows: number;
    private headers: Headers;
    
    constructor(school_code?: string | number, username?: string, password?: string) {
        this.school_code = school_code ? school_code.toString() : "";
        this.username = username || "";
        this.password = password || "";

        this.directory = path.parse(__dirname).dir;
        this.base_url = `https://www.portaleargo.it/famiglia/api/rest`;
        this.api_version = "2.5.4";

        this.authorized = false;
        this.token;
        this.user = {};

        this.last_update;

        this.maxRows = 100;
        this.headers = {
            "x-key-app": "ax6542sdru3217t4eesd9",
            "x-version": this.api_version,
            "x-produttore-software": "ARGO Software s.r.l. - Ragusa",
            "x-app-code": "APF",
            "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
            "x-cod-min": this.school_code,
            "x-max-return-record": this.maxRows.toString()
        };
    };

    async login(school_code: string | number = this.school_code, username: string = this.username, password: string = this.password): Promise<false | void | User> {

        if(this.authorized) return this.log("Already logged in ❌");

        if (!school_code || !username || !password) return this.log("Missing credentials ❌");
        
        const token = await this.getToken(school_code, username, password);
        if(!token) return this.log("Could not login ❌");

        const userData = await this.getUserData(token);
        if(!userData) return this.log("Could not get user data ❌");
        
        const newData = this.updateData(userData);
        if (!newData) return this.log("Could not login (Data not updated) ❌");

        if (!this.authorized) {
            this.log("Could not login ❌");
            return false; 
        };
        
        this.log(`Successfully logged in as "${this.user?.name} ${this.user?.surname}" ✅`);
        return this.user;
    };

    async logout(): Promise<boolean> {
        if(!this.authorized) {
            this.log("Already logged out ❌");
            return false;
        };

        this.authorized = false;
        this.token = "";
        this.user = {};
        this.last_update = undefined;
        
        this.log("Logout successful ✅");
        return true;
    };

    async getStatus(): Promise<any> {
        const data = await this.fetch("verifica");
        return data ?? {};
    };

    async getToday(date: string | Date = new Date()): Promise<any> {
        const data = await this.fetch("oggi", undefined, date);
        return data?.dati ?? [];
    };

    async getAbsences(): Promise<any> {
        const data = await this.fetch("assenze");
        return data?.dati ?? [];
    };

    async getTodayGrades(): Promise<any> {
        const data = await this.fetch("votigiornalieri");
        return data?.dati ?? [];
    };

    async getNotes(): Promise<any> {
        const data = await this.fetch("notedisciplinari");
        return data?.dati ?? [];
    };

    async getPeriods(): Promise<any> {
        const data = await this.fetch("periodiclasse");
        return data?.dati ?? [];
    };

    async getFinalGrades(): Promise<any> {
        const data = await this.fetch("votiscrutinio");
        return data ?? [];
    };

    async getHomework(): Promise<any> {
        const data = await this.fetch("compiti");
        return data?.dati ?? [];
    };

    async getLessonsInfo(): Promise<any> {
        const data = await this.fetch("argomenti");
        return data?.dati ?? [];
    };

    async getReminders(): Promise<any> {
        const data = await this.fetch("promemoria");
        return data?.dati ?? [];
    };

    async getSchedule(): Promise<any> {
        const data = await this.fetch("orario");
        return data?.dati ?? [];
    };

    async getTalks(): Promise<any> {
        const data = await this.fetch("prenotazioniricevimento");
        return data ?? [];
    };

    async getTeachers(): Promise<any> {
        const data = await this.fetch("docenticlasse");
        return data ?? [];
    };

    async getNoticeboard(): Promise<any> {
        const data = await this.fetch("bachecanuova");
        return data?.dati ?? [];
    };

    async getDidactics(): Promise<any> {
        const data = await this.fetch("bachecaalunno");
        return data?.dati ?? [];
    };

    async getSharedFiles(): Promise<any> {
        const data = await this.fetch("condivisionefile");
        return data?.dati ?? [];
    };

    async getBSmart(): Promise<any> {
        const data = await this.fetch("bsmart");
        return data ?? {};
    };

    setMaxRows(rows: number = 100): boolean {
        this.maxRows = rows;
        this.headers["x-max-return-record"] = rows.toString();
        return this.maxRows === rows && this.headers["x-max-return-record"] === rows.toString();
    };

    private async fetch(path = '/', method: string | undefined = "GET", day?: string | Date): Promise<any> {
        if (!this.authorized || !this.token) return this.log("Not logged in ❌");
        const headers: HeadersInit = Object.assign({ 
            "x-auth-token": this.token,
            "x-prg-alunno": this.user?.id,
            "x-prg-scheda": this.user?.school?.scheda || 1,
            "x-prg-scuola": this.user?.school?.id || 1,
        }, this.headers);

        let date: Date, dateString: string = "";

        if (day) {
            date = new Date(day);
            dateString = `&datGiorno=${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
        };

        const response: Response = await fetch(`${this.base_url}/${path}?_dc=${Date.now().toString()}${dateString}&page=1&start=0&limit=25`, {
            method,
            headers,
        });

        const json: any = await response.json()
        .catch((e) => this.log(`Error while parsing json at /${path} ❌`));

        if (response.status != 200) return this.log(`Error while fetching /${path} (${response.status}) ❌`);
        return json;
    };

    private updateData(data: Array<any> | undefined): boolean | Promise<boolean> {
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

    private async getUserData(token: string = this.token): Promise<any> {
        const headers: HeadersInit = Object.assign({ "x-auth-token": token }, this.headers);

        const response: Response = await fetch(`${this.base_url}/schede?_dc=${(Date.now()*1000).toFixed()}`, {
            headers
        });

        if(response.status != 200) {
            this.log("Error getting user data ❌");
            return false;
        };

        const json: any = await response.json()
        .catch(async (e) => {
            return this.log("Error while parsing JSON ❌");
        });

        if (!json) return this.log(`No data avaible on user data (${response.status}) ❌`);
        if (json.errCode) return this.log(`Error: ${json.value} ❌ (${json.errCode})`);
        
        return json;
    };
    
    private async getToken(school_code: string | number = this.school_code, username: string = this.username, password: string = this.password): Promise<string | false | void> {
        this.headers["x-cod-min"] = school_code.toString();
        const headers: HeadersInit = Object.assign({ 
            "x-user-id": username,
            "x-pwd": password,
        }, this.headers);

        const response: Response = await fetch(`${this.base_url}/login?_dc=${Date.now().toFixed()}`, {
            headers
        });

        if(response.status != 200) {
            this.log("Error getting token ❌");
            return false;
        };

        const json: any = await response.json()
        .catch(async (e) => {
            return this.log("Error while parsing JSON ❌");
        });

        if (!json) return this.log(`No data avaible on login (${response.status}) ❌`);
        if (json.errCode) return this.log(`Error: ${json.value} ❌ (${json.errCode})`);
        
        this.token = json.token;
        return this.token;
    };

    private log(...args: unknown[]): void {
        console.log(`\x1b[36m[ARGO]\x1b[0m`, ...args);
    };
};

export default Argo;