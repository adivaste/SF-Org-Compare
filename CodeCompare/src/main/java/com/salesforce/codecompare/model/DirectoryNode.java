package com.salesforce.codecompare.model;

import java.util.ArrayList;
import java.util.List;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DirectoryNode {
    private String name;
    private String type; 
    private String status; 
    private String path; 
    private List<DirectoryNode> children;

    public DirectoryNode(String name, String type) {
        this.name = name;
        this.type = type;
        this.children = new ArrayList<>();
    }

    public void addChild(DirectoryNode child) {
        this.children.add(child);
    }
}
