package tech.adivaste.CodeCompare.service;

import tech.adivaste.CodeCompare.model.Org;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.concurrent.CompletableFuture;

@Service
public class OrgService {
    
    private static final Logger logger = LoggerFactory.getLogger(OrgService.class);
    
    @Autowired
    private SfdxService sfdxService;
    
    @Autowired
    private GitService gitService;
    
    @Value("${codecompare.repo.base-path:./repositories}")
    private String baseRepoPath;
    
    /**
     * Check if SFDX is installed and accessible
     */
    public boolean isSfdxAvailable() {
        return sfdxService.isSfdxInstalled();
    }
    
    /**
     * List all connected Salesforce orgs
     */
    public List<Org> listConnectedOrgs() {
        logger.info("Listing connected Salesforce orgs");
        return sfdxService.listConnectedOrgs();
    }
    
    /**
     * Connect to a Salesforce org and setup repository
     */
    public CompletableFuture<Org> connectAndSetupOrg(String orgAlias, String instanceUrl) {
        logger.info("Connecting to Salesforce org: {} with instance: {}", orgAlias, instanceUrl);
        
        return sfdxService.connectToOrg(orgAlias, instanceUrl)
                .thenApply(org -> {
                    if (org != null) {
                        // Setup git repository for the org
                        setupOrgRepository(org);
                    }
                    return org;
                });
    }
    
    /**
     * Setup git repository and branches for an organization
     */
    public boolean setupOrgRepository(Org org) {
        String orgName = org.getAlias();
        logger.info("Setting up git repository for org: {}", orgName);
        
        try {
            // Create git repository
            if (!gitService.createOrgRepository(orgName, baseRepoPath)) {
                logger.error("Failed to create git repository for org: {}", orgName);
                return false;
            }
            
            // Create branches (Sandbox, UAT, Prod)
            if (!gitService.createOrgBranches(orgName, baseRepoPath)) {
                logger.error("Failed to create branches for org: {}", orgName);
                return false;
            }
            
            // Set the git repo path in the org object
            org.setGitRepoPath(baseRepoPath + "/" + orgName);
            
            logger.info("Successfully setup git repository for org: {}", orgName);
            return true;
            
        } catch (Exception e) {
            logger.error("Error setting up repository for org {}: {}", orgName, e.getMessage());
            return false;
        }
    }
    
    /**
     * Retrieve metadata from a specific org and branch
     */
    public boolean retrieveMetadataForBranch(String orgAlias, String branchName, String metadataTypes) {
        logger.info("Retrieving metadata for org: {} branch: {}", orgAlias, branchName);
        
        try {
            // Switch to the specified branch
            if (!gitService.switchToBranch(orgAlias, branchName, baseRepoPath)) {
                logger.error("Failed to switch to branch {} for org: {}", branchName, orgAlias);
                return false;
            }
            
            // Retrieve metadata using SFDX
            if (!sfdxService.retrieveMetadata(orgAlias, metadataTypes, baseRepoPath + "/" + orgAlias)) {
                logger.error("Failed to retrieve metadata for org: {} branch: {}", orgAlias, branchName);
                return false;
            }
            
            // Commit the retrieved metadata
            String commitMessage = "Retrieved metadata for " + branchName + " - " + java.time.LocalDateTime.now();
            if (!gitService.commitMetadata(orgAlias, branchName, baseRepoPath, commitMessage)) {
                logger.error("Failed to commit metadata for org: {} branch: {}", orgAlias, branchName);
                return false;
            }
            
            logger.info("Successfully retrieved and committed metadata for org: {} branch: {}", orgAlias, branchName);
            return true;
            
        } catch (Exception e) {
            logger.error("Error retrieving metadata for org {} branch {}: {}", orgAlias, branchName, e.getMessage());
            return false;
        }
    }
    
    /**
     * Get org information by alias
     */
    public Org getOrgInfo(String orgAlias) {
        logger.info("Getting org info for: {}", orgAlias);
        return sfdxService.getOrgInfo(orgAlias);
    }
    
    /**
     * Check if org is connected and accessible
     */
    public boolean isOrgConnected(String orgAlias) {
        return sfdxService.isOrgConnected(orgAlias);
    }
    
    /**
     * Check if repository exists for an organization
     */
    public boolean repositoryExists(String orgAlias) {
        return gitService.repositoryExists(orgAlias, baseRepoPath);
    }
    
    /**
     * Get current branch for an organization
     */
    public String getCurrentBranch(String orgAlias) {
        return gitService.getCurrentBranch(orgAlias, baseRepoPath);
    }
    
    /**
     * Get list of files in the repository
     */
    public List<String> getRepositoryFiles(String orgAlias) {
        return gitService.getRepositoryFiles(orgAlias, baseRepoPath);
    }
    
    /**
     * Get diff between two branches
     */
    public String getDiffBetweenBranches(String orgAlias, String branch1, String branch2) {
        logger.info("Getting diff between {} and {} for org: {}", branch1, branch2, orgAlias);
        return gitService.getDiffBetweenBranches(orgAlias, branch1, branch2, baseRepoPath);
    }
    
    /**
     * Get file content from a specific branch
     */
    public String getFileContent(String orgAlias, String branchName, String filePath) {
        logger.info("Getting file content for {} in branch {} for org: {}", filePath, branchName, orgAlias);
        return gitService.getFileContent(orgAlias, branchName, filePath, baseRepoPath);
    }
    
    /**
     * Setup complete org with all branches and metadata retrieval
     */
    public boolean setupCompleteOrg(String orgAlias, String instanceUrl, String metadataTypes) {
        logger.info("Setting up complete org: {} with instance: {}", orgAlias, instanceUrl);
        
        try {
            // Connect to org
            CompletableFuture<Org> orgFuture = connectAndSetupOrg(orgAlias, instanceUrl);
            Org org = orgFuture.get(); // Wait for completion
            
            if (org == null) {
                logger.error("Failed to connect to org: {}", orgAlias);
                return false;
            }
            
            // Retrieve metadata for each branch
            String[] branches = {"Sandbox", "UAT", "Prod"};
            for (String branch : branches) {
                if (!retrieveMetadataForBranch(orgAlias, branch, metadataTypes)) {
                    logger.warn("Failed to retrieve metadata for branch: {} in org: {}", branch, orgAlias);
                }
            }
            
            logger.info("Successfully setup complete org: {}", orgAlias);
            return true;
            
        } catch (Exception e) {
            logger.error("Error setting up complete org {}: {}", orgAlias, e.getMessage());
            return false;
        }
    }
} 