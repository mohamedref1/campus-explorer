/**
 * This is our primary Rooms dataset model design
 */

export interface IDatasetResponse {
    code: number;
    body: IDatasetResponseSuccessBody | IDatasetResponseErrorBody;
}

export interface IDatasetResponseSuccessBody {
   result: number | string;
}

export interface IDatasetResponseErrorBody {
   error: string;
}

export interface IRoom {
    rooms_fullname: string;
    rooms_shortname: string;
    rooms_number: string;
    rooms_name: string;
    rooms_address: string;
    rooms_seats: number;
    rooms_lat?: number;
    rooms_lon?: number;
    rooms_type: string;
    rooms_furniture: string;
    rooms_href: string;
}

export interface IBuilding {

   /**
    * @returns the name of the building
    */
   getName(): string;

   /**
    * @returns a list of rooms that this course has
    */
   getRooms(): IRoom[];
}

export default interface IBuildingsDataset {

   /**
    * @returns the name of the buildings dataset
    */
   getName(): string;

   /**
    * @returns a list of buildings that this dataset has
    */
   getBuildings(): IBuilding[];

   /**
    * locally, store the given data to hard disk.
    *
    * @return Promise <IDatasetResponse>
    *
    * The promise should return an IDatasetResponse for both fulfill and reject.
    *
    * Fulfill should be for 2XX codes and reject for everything else.
    *
    * Response codes:
    *
    * 204: the operation was successful
    * 400: the operation failed. The body should contain {"error": "my text"}
    * to explain what went wrong. This should also be used if there is no space on the disk
    */
   store(): Promise<IDatasetResponse>;

   /**
    * Loading buildings and their rooms from the disk to the object that calls it
    *
    * @return Promise <IDatasetResponse>
    *
    * The promise should return an IDatasetResponse for both fulfill and reject.
    *
    * Fulfill should be for 2XX codes and reject for everything else.
    *
    * Response codes:
    *
    * 204: the operation was successful
    * 400: the operation failed. The body should contain {"error": "my text"}
    * to explain what went wrong. This should also be used if there is no
    * data on the disk to load
    */
   load(): Promise<IDatasetResponse>;

   /**
    * remove buildings and their rooms of the given id from the disk
    *
    * @return Promise <IDatasetResponse>
    *
    * The promise should return an IDatasetResponse for both fulfill and reject.
    *
    * Fulfill should be for 2XX codes and reject for everything else.
    *
    * Response codes:
    *
    * 204: the operation was successful
    * 400: the operation failed. The body should contain {"error": "my text"}
    * to explain what went wrong. This should also be used if there is no
    * data on the disk to remove
    */
   remove(): Promise<IDatasetResponse>;
}
