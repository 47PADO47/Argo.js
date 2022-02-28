export interface User {
  name?: string;
  surname?: string;
  citizenship?: string;
  sex?: string;
  fiscalCode?: string;
  id?: number | string;
  phone?: {
    mobile?: string;
    home?: string;
  };
  birth?: {
    place?: string;
    date?: string;
  };
  residence?: {
    address?: string;
    municipality?: string;
    cap?: string;
    deliveryMunicipality?: string;
    delivery?: string;
  };
  school?: {
    code?: string;
    branch?: string;
    name?: string;
    course?: string;
    class?: string | number;
    classId?: number | string;
    scheda?: number;
    id?: number;
  };
  annoScolastico?: {
    datInizio?: string;
    datFine?: string;
  };
  abilitazioni?: any;
}

export type Headers = {
  [key: string]: string;
};
