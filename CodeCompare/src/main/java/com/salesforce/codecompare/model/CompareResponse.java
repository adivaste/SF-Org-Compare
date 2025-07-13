package com.salesforce.codecompare.model;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class CompareResponse {
    private boolean success;
    private String message;
    private Object data;
    private String error;

    // Private constructor
    private CompareResponse(boolean success, String message, Object data, String error) {
        this.success = success;
        this.message = message;
        this.data = data;
        this.error = error;
    }

    // Static factory methods
    public static CompareResponse success(Object data) {
        return new CompareResponse(true, "Success", data, null);
    }

    public static CompareResponse success(Object data, String message) {
        return new CompareResponse(true, message, data, null);
    }

    public static CompareResponse error(String error) {
        return new CompareResponse(false, null, null, error);
    }

    public static CompareResponse error(String error, String message) {
        return new CompareResponse(false, message, null, error);
    }

    // Getters and setters
    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public Object getData() {
        return data;
    }

    public void setData(Object data) {
        this.data = data;
    }

    public String getError() {
        return error;
    }

    public void setError(String error) {
        this.error = error;
    }

    @Override
    public String toString() {
        return "CompareResponse{" +
                "success=" + success +
                ", message='" + message + '\'' +
                ", data=" + data +
                ", error='" + error + '\'' +
                '}';
    }
} 