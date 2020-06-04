/**
 * This is our primary courses dataset model design
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

 export interface ISection {
    courses_dept: string;
    courses_id: string;
    courses_avg: number;
    courses_instructor: string;
    courses_title: string;
    courses_pass: number;
    courses_fail: number;
    courses_audit: number;
    courses_uuid: string;
    courses_year: number;
 }

 export interface ICourse {

    /**
     * @returns the name of the course
     */
    getName(): string;

    /**
     * @returns a list of sections that this course has
     */
    getSections(): ISection[];
 }

 export default interface ICoursesDataset {

    /**
     * @returns the name of the courses dataset
     */
    getName(): string;

    /**
     * @returns a list of courses that this dataset has
     */
    getCourses(): ICourse[];

    /**
     * locally, store the given data to hard disk.
     *
     * @return Promise <ICourseDatasetResponse>
     *
     * The promise should return an ICourseDatasetResponse for both fulfill and reject.
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
     * Loading courses and their sections from the disk to the object that calls it
     *
     * @return Promise <ICourseDatasetResponse>
     *
     * The promise should return an ICourseDatasetResponse for both fulfill and reject.
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
     * remove courses and their sections of the given id from the disk
     *
     * @return Promise <ICourseDatasetResponse>
     *
     * The promise should return an ICourseDatasetResponse for both fulfill and reject.
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
