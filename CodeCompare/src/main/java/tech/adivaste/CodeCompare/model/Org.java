package tech.adivaste.CodeCompare.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDateTime;

public class Org {
    @JsonProperty("alias")
    private String alias;
    
    @JsonProperty("username")
    private String username;
    
    @JsonProperty("instanceUrl")
    private String instanceUrl;
    
    @JsonProperty("orgId")
    private String orgId;
    
    @JsonProperty("orgType")
    private String orgType; // Production, Sandbox, Developer, etc.
    
    @JsonProperty("isConnected")
    private boolean isConnected;
    
    @JsonProperty("connectedAt")
    private LocalDateTime connectedAt;
    
    @JsonProperty("gitRepoPath")
    private String gitRepoPath;

    // Constructors
    public Org() {}

    public Org(String alias, String username, String instanceUrl, String orgId, String orgType) {
        this.alias = alias;
        this.username = username;
        this.instanceUrl = instanceUrl;
        this.orgId = orgId;
        this.orgType = orgType;
        this.isConnected = true;
        this.connectedAt = LocalDateTime.now();
    }

    // Getters and Setters
    public String getAlias() {
        return alias;
    }

    public void setAlias(String alias) {
        this.alias = alias;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getInstanceUrl() {
        return instanceUrl;
    }

    public void setInstanceUrl(String instanceUrl) {
        this.instanceUrl = instanceUrl;
    }

    public String getOrgId() {
        return orgId;
    }

    public void setOrgId(String orgId) {
        this.orgId = orgId;
    }

    public String getOrgType() {
        return orgType;
    }

    public void setOrgType(String orgType) {
        this.orgType = orgType;
    }

    public boolean isConnected() {
        return isConnected;
    }

    public void setConnected(boolean connected) {
        isConnected = connected;
    }

    public LocalDateTime getConnectedAt() {
        return connectedAt;
    }

    public void setConnectedAt(LocalDateTime connectedAt) {
        this.connectedAt = connectedAt;
    }

    public String getGitRepoPath() {
        return gitRepoPath;
    }

    public void setGitRepoPath(String gitRepoPath) {
        this.gitRepoPath = gitRepoPath;
    }

    @Override
    public String toString() {
        return "Org{" +
                "alias='" + alias + '\'' +
                ", username='" + username + '\'' +
                ", instanceUrl='" + instanceUrl + '\'' +
                ", orgId='" + orgId + '\'' +
                ", orgType='" + orgType + '\'' +
                ", isConnected=" + isConnected +
                ", connectedAt=" + connectedAt +
                ", gitRepoPath='" + gitRepoPath + '\'' +
                '}';
    }
} 