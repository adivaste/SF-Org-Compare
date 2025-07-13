package com.salesforce.codecompare.model;

public class FileContent {
    private String filePath;
    private String content;
    private String branch;
    private long fileSize;
    private String encoding;
    private boolean exists;

    // Default constructor
    public FileContent() {}

    // Constructor with parameters
    public FileContent(String filePath, String content, String branch) {
        this.filePath = filePath;
        this.content = content;
        this.branch = branch;
        this.exists = content != null;
        this.fileSize = content != null ? content.length() : 0;
        this.encoding = "UTF-8"; // Default encoding
    }

    // Constructor for non-existent files
    public FileContent(String filePath, String branch, boolean exists) {
        this.filePath = filePath;
        this.branch = branch;
        this.exists = exists;
        this.content = null;
        this.fileSize = 0;
        this.encoding = "UTF-8";
    }

    // Getters and setters
    public String getFilePath() {
        return filePath;
    }

    public void setFilePath(String filePath) {
        this.filePath = filePath;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
        this.exists = content != null;
        this.fileSize = content != null ? content.length() : 0;
    }

    public String getBranch() {
        return branch;
    }

    public void setBranch(String branch) {
        this.branch = branch;
    }

    public long getFileSize() {
        return fileSize;
    }

    public void setFileSize(long fileSize) {
        this.fileSize = fileSize;
    }

    public String getEncoding() {
        return encoding;
    }

    public void setEncoding(String encoding) {
        this.encoding = encoding;
    }

    public boolean isExists() {
        return exists;
    }

    public void setExists(boolean exists) {
        this.exists = exists;
    }

    @Override
    public String toString() {
        return "FileContent{" +
                "filePath='" + filePath + '\'' +
                ", branch='" + branch + '\'' +
                ", exists=" + exists +
                ", fileSize=" + fileSize +
                ", encoding='" + encoding + '\'' +
                '}';
    }
} 