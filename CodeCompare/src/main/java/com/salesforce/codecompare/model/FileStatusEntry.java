package com.salesforce.codecompare.model;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class FileStatusEntry {
    private String path;
    private String fileName;
    private String status;

    public FileStatusEntry() {}

    public FileStatusEntry(String path, String fileName, String status) {
        this.path = path;
        this.fileName = fileName;
        this.status = status;
    }
}
