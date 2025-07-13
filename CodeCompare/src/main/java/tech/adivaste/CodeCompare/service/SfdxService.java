package tech.adivaste.CodeCompare.service;

import tech.adivaste.CodeCompare.model.Org;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.Map;

@Service
public class SfdxService {
    
    private static final Logger logger = LoggerFactory.getLogger(SfdxService.class);
    private static final String SF_PATH = "D:\\Programs\\sf\\bin\\sf.cmd";
    
    /**
     * Check if SFDX CLI is installed and accessible
     */
    public boolean isSfdxInstalled() {
        try {
            ProcessBuilder processBuilder = new ProcessBuilder(SF_PATH, "--version");
            Process process = processBuilder.start();
            int exitCode = process.waitFor();
            return exitCode == 0;
        } catch (IOException | InterruptedException e) {
            logger.error("Error checking SFDX installation: {}", e.getMessage());
            return false;
        }
    }
    
    /**
     * List all connected orgs
     */
    public List<Org> listConnectedOrgs() {
        List<Org> orgs = new ArrayList<>();
        try {
            ProcessBuilder processBuilder = new ProcessBuilder(SF_PATH, "org", "list", "--json");
            Process process = processBuilder.start();
            
            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            StringBuilder output = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                output.append(line).append("\n");
            }
            
            int exitCode = process.waitFor();
            if (exitCode == 0) {
                logger.info("Raw SF org list output: {}", output.toString());
                // Parse the JSON output to extract org information
                orgs = parseOrgsFromJson(output.toString());
            } else {
                logger.error("Failed to list orgs. Exit code: {}", exitCode);
            }
        } catch (IOException | InterruptedException e) {
            logger.error("Error listing connected orgs: {}", e.getMessage());
        }
        return orgs;
    }
    
    /**
     * Connect to a Salesforce org using web-based authentication
     */
    public CompletableFuture<Org> connectToOrg(String orgAlias, String instanceUrl) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                // Start the web-based authentication process
                ProcessBuilder processBuilder = new ProcessBuilder(
                    SF_PATH, "org", "login", "web", 
                    "--alias", orgAlias,
                    "--instance-url", instanceUrl,
                    "--json"
                );
                
                Process process = processBuilder.start();
                
                // Read the output to get the auth URL
                BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
                StringBuilder output = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    output.append(line).append("\n");
                }
                
                int exitCode = process.waitFor();
                if (exitCode == 0) {
                    // Parse the output to get org details
                    return parseOrgFromAuthOutput(output.toString(), orgAlias);
                } else {
                    logger.error("Failed to connect to org. Exit code: {}", exitCode);
                    throw new RuntimeException("Failed to connect to Salesforce org");
                }
            } catch (IOException | InterruptedException e) {
                logger.error("Error connecting to org: {}", e.getMessage());
                throw new RuntimeException("Error connecting to Salesforce org", e);
            }
        });
    }
    
    /**
     * Retrieve metadata from a connected org
     */
    public boolean retrieveMetadata(String orgAlias, String metadataTypes, String outputDir) {
        try {
            ProcessBuilder processBuilder = new ProcessBuilder(
                SF_PATH, "project", "retrieve", "start",
                "--source-org", orgAlias,
                "--metadata-types", metadataTypes,
                "--target-org", orgAlias,
                "--json"
            );
            
            Process process = processBuilder.start();
            int exitCode = process.waitFor();
            
            if (exitCode == 0) {
                logger.info("Successfully retrieved metadata for org: {}", orgAlias);
                return true;
            } else {
                logger.error("Failed to retrieve metadata for org: {}. Exit code: {}", orgAlias, exitCode);
                return false;
            }
        } catch (IOException | InterruptedException e) {
            logger.error("Error retrieving metadata for org {}: {}", orgAlias, e.getMessage());
            return false;
        }
    }
    
    /**
     * Get org information by alias
     */
    public Org getOrgInfo(String orgAlias) {
        try {
            ProcessBuilder processBuilder = new ProcessBuilder(SF_PATH, "org", "display", "--target-org", orgAlias, "--json");
            Process process = processBuilder.start();
            
            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            StringBuilder output = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                output.append(line).append("\n");
            }
            
            int exitCode = process.waitFor();
            if (exitCode == 0) {
                return parseOrgFromDisplayOutput(output.toString(), orgAlias);
            } else {
                logger.error("Failed to get org info for {}. Exit code: {}", orgAlias, exitCode);
                return null;
            }
        } catch (IOException | InterruptedException e) {
            logger.error("Error getting org info for {}: {}", orgAlias, e.getMessage());
            return null;
        }
    }
    
    /**
     * Check if org is connected and accessible
     */
    public boolean isOrgConnected(String orgAlias) {
        try {
            ProcessBuilder processBuilder = new ProcessBuilder(SF_PATH, "org", "display", "--target-org", orgAlias);
            Process process = processBuilder.start();
            int exitCode = process.waitFor();
            return exitCode == 0;
        } catch (IOException | InterruptedException e) {
            logger.error("Error checking org connection for {}: {}", orgAlias, e.getMessage());
            return false;
        }
    }
    
    /**
     * Parse orgs from SFDX org list JSON output
     */
    private List<Org> parseOrgsFromJson(String jsonOutput) {
        List<Org> orgs = new ArrayList<>();
        
        try {
            // The JSON structure has orgs nested under result.nonScratchOrgs and result.sandboxes
            // Look for org objects in the JSON
            Pattern orgPattern = Pattern.compile(
                "\"alias\":\\s*\"([^\"]+)\".*?" +
                "\"username\":\\s*\"([^\"]+)\".*?" +
                "\"instanceUrl\":\\s*\"([^\"]+)\".*?" +
                "\"orgId\":\\s*\"([^\"]+)\".*?" +
                "\"connectedStatus\":\\s*\"([^\"]+)\"",
                Pattern.DOTALL
            );
            
            Matcher matcher = orgPattern.matcher(jsonOutput);
            
            while (matcher.find()) {
                String alias = matcher.group(1);
                String username = matcher.group(2);
                String instanceUrl = matcher.group(3);
                String orgId = matcher.group(4);
                String connectedStatus = matcher.group(5);
                
                // Only include connected orgs
                if ("Connected".equals(connectedStatus)) {
                    Org org = new Org(alias, username, instanceUrl, orgId, "Unknown");
                    orgs.add(org);
                    logger.info("Parsed connected org: {}", alias);
                } else {
                    logger.info("Skipping org {} with status: {}", alias, connectedStatus);
                }
            }
            
        } catch (Exception e) {
            logger.error("Error parsing org list: {}", e.getMessage());
        }
        
        logger.info("Total connected orgs parsed: {}", orgs.size());
        return orgs;
    }
    
    /**
     * Parse org from authentication output
     */
    private Org parseOrgFromAuthOutput(String output, String orgAlias) {
        // Parse the authentication output to extract org details
        // This is a simplified implementation
        Pattern pattern = Pattern.compile("\"username\":\\s*\"([^\"]+)\".*?\"instanceUrl\":\\s*\"([^\"]+)\".*?\"orgId\":\\s*\"([^\"]+)\"");
        Matcher matcher = pattern.matcher(output);
        
        if (matcher.find()) {
            String username = matcher.group(1);
            String instanceUrl = matcher.group(2);
            String orgId = matcher.group(3);
            
            return new Org(orgAlias, username, instanceUrl, orgId, "Unknown");
        }
        
        throw new RuntimeException("Failed to parse org information from authentication output");
    }
    
    /**
     * Parse org from display output
     */
    private Org parseOrgFromDisplayOutput(String output, String orgAlias) {
        // Parse the org display output
        Pattern usernamePattern = Pattern.compile("\"username\":\\s*\"([^\"]+)\"");
        Pattern instanceUrlPattern = Pattern.compile("\"instanceUrl\":\\s*\"([^\"]+)\"");
        Pattern orgIdPattern = Pattern.compile("\"orgId\":\\s*\"([^\"]+)\"");
        
        Matcher usernameMatcher = usernamePattern.matcher(output);
        Matcher instanceUrlMatcher = instanceUrlPattern.matcher(output);
        Matcher orgIdMatcher = orgIdPattern.matcher(output);
        
        String username = usernameMatcher.find() ? usernameMatcher.group(1) : "";
        String instanceUrl = instanceUrlMatcher.find() ? instanceUrlMatcher.group(1) : "";
        String orgId = orgIdMatcher.find() ? orgIdMatcher.group(1) : "";
        
        return new Org(orgAlias, username, instanceUrl, orgId, "Unknown");
    }
} 