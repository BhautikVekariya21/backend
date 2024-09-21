class ApiResponse {
    constructor(startusCode,data,message="success"){
        this.startusCode= startusCode;
        this.data = data;
        this.message = message;
        this.success=startusCode < 400
    }
}