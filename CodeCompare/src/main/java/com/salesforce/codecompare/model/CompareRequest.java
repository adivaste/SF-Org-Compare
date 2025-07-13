package com.salesforce.codecompare.model;

public class CompareRequest {
    private String orgPath;
    private String sourceBranch;
    private String targetBranch;

    // Default constructor
    public CompareRequest() {}

    // Constructor with parameters
    public CompareRequest(String orgPath, String sourceBranch, String targetBranch) {
        this.orgPath = orgPath;
        this.sourceBranch = sourceBranch;
        this.targetBranch = targetBranch;
    }

    // Getters and setters
    public String getOrgPath() {
        return orgPath;
    }

    public void setOrgPath(String orgPath) {
        this.orgPath = orgPath;
    }

    public String getSourceBranch() {
        return sourceBranch;
    }

    public void setSourceBranch(String sourceBranch) {
        this.sourceBranch = sourceBranch;
    }

    public String getTargetBranch() {
        return targetBranch;
    }

    public void setTargetBranch(String targetBranch) {
        this.targetBranch = targetBranch;
    }

    @Override
    public String toString() {
        return "CompareRequest{" +
                "orgPath='" + orgPath + '\'' +
                ", sourceBranch='" + sourceBranch + '\'' +
                ", targetBranch='" + targetBranch + '\'' +
                '}';
    }
} 