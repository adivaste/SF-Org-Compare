package com.salesforce.codecompare.model;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class FileDiffRequest {
    private String branch1;
    private String branch2;
    private String filePath;
}