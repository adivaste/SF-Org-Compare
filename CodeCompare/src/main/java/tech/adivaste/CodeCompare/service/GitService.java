package tech.adivaste.CodeCompare.service;

import org.eclipse.jgit.api.Git;
import org.eclipse.jgit.api.errors.GitAPIException;
import org.eclipse.jgit.diff.DiffEntry;
import org.eclipse.jgit.diff.DiffFormatter;
import org.eclipse.jgit.lib.ObjectId;
import org.eclipse.jgit.lib.Repository;
import org.eclipse.jgit.revwalk.RevCommit;
import org.eclipse.jgit.revwalk.RevWalk;
import org.eclipse.jgit.transport.UsernamePasswordCredentialsProvider;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.salesforce.codecompare.model.DiffResult;
import com.salesforce.codecompare.model.FileContent;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.stream.Collectors;
import java.util.ArrayList;

@Service
public class GitService {
    
    private static final Logger logger = LoggerFactory.getLogger(GitService.class);
    
    /**
     * Create a new git repository for an organization
     */
    public boolean createOrgRepository(String orgName, String basePath) {
        try {
            Path repoPath = Paths.get(basePath, orgName);
            
            // Create directory if it doesn't exist
            if (!Files.exists(repoPath)) {
                Files.createDirectories(repoPath);
            }
            
            // Initialize git repository
            try (Git git = Git.init().setDirectory(repoPath.toFile()).call()) {
                logger.info("Created git repository for org: {} at {}", orgName, repoPath);
                
                // Create initial commit
                git.add().addFilepattern(".").call();
                git.commit().setMessage("Initial commit for " + orgName).call();
                
                return true;
            }
        } catch (IOException | GitAPIException e) {
            logger.error("Error creating git repository for org {}: {}", orgName, e.getMessage());
            return false;
        }
    }
    
    /**
     * Create branches for an organization (Sandbox, UAT, Prod)
     */
    public boolean createOrgBranches(String orgName, String basePath) {
        try {
            Path repoPath = Paths.get(basePath, orgName);
            
            if (!Files.exists(repoPath)) {
                logger.error("Repository does not exist for org: {}", orgName);
                return false;
            }
            
            try (Git git = Git.open(repoPath.toFile())) {
                // Create branches
                String[] branches = {"Sandbox", "UAT", "Prod"};
                
                for (String branch : branches) {
                    try {
                        git.checkout()
                           .setCreateBranch(true)
                           .setName(branch)
                           .call();
                        
                        logger.info("Created branch {} for org: {}", branch, orgName);
                        
                        // Switch back to main branch
                        git.checkout().setName("main").call();
                    } catch (GitAPIException e) {
                        logger.warn("Branch {} might already exist for org {}: {}", branch, orgName, e.getMessage());
                    }
                }
                
                return true;
            }
        } catch (IOException e) {
            logger.error("Error creating branches for org {}: {}", orgName, e.getMessage());
            return false;
        }
    }
    
    /**
     * Switch to a specific branch
     */
    public boolean switchToBranch(String orgName, String branchName, String basePath) {
        try {
            Path repoPath = Paths.get(basePath, orgName);
            
            if (!Files.exists(repoPath)) {
                logger.error("Repository does not exist for org: {}", orgName);
                return false;
            }
            
            try (Git git = Git.open(repoPath.toFile())) {
                git.checkout().setName(branchName).call();
                logger.info("Switched to branch {} for org: {}", branchName, orgName);
                return true;
            }
        } catch (IOException | GitAPIException e) {
            logger.error("Error switching to branch {} for org {}: {}", branchName, orgName, e.getMessage());
            return false;
        }
    }
    
    /**
     * Add and commit metadata files
     */
    public boolean commitMetadata(String orgName, String branchName, String basePath, String commitMessage) {
        try {
            Path repoPath = Paths.get(basePath, orgName);
            
            if (!Files.exists(repoPath)) {
                logger.error("Repository does not exist for org: {}", orgName);
                return false;
            }
            
            try (Git git = Git.open(repoPath.toFile())) {
                // Switch to the specified branch
                git.checkout().setName(branchName).call();
                
                // Add all files
                git.add().addFilepattern(".").call();
                
                // Commit changes
                git.commit().setMessage(commitMessage).call();
                
                logger.info("Committed metadata to branch {} for org: {}", branchName, orgName);
                return true;
            }
        } catch (IOException | GitAPIException e) {
            logger.error("Error committing metadata for org {} branch {}: {}", orgName, branchName, e.getMessage());
            return false;
        }
    }
    
    /**
     * Get list of files in the repository
     */
    public List<String> getRepositoryFiles(String orgName, String basePath) {
        try {
            Path repoPath = Paths.get(basePath, orgName);
            
            if (!Files.exists(repoPath)) {
                logger.error("Repository does not exist for org: {}", orgName);
                return List.of();
            }
            
            return Files.walk(repoPath)
                       .filter(Files::isRegularFile)
                       .map(path -> repoPath.relativize(path).toString())
                       .filter(path -> !path.startsWith(".git"))
                       .collect(Collectors.toList());
        } catch (IOException e) {
            logger.error("Error getting repository files for org {}: {}", orgName, e.getMessage());
            return List.of();
        }
    }
    
    /**
     * Get diff between two branches
     */
    public String getDiffBetweenBranches(String orgName, String branch1, String branch2, String basePath) {
        try {
            Path repoPath = Paths.get(basePath, orgName);
            if (!Files.exists(repoPath)) {
                logger.error("Repository does not exist for org: {}", orgName);
                return "";
            }
            try (Git git = Git.open(repoPath.toFile());
                 Repository repository = git.getRepository();
                 RevWalk revWalk = new RevWalk(repository)) {

                ObjectId branch1Id = repository.resolve(branch1);
                ObjectId branch2Id = repository.resolve(branch2);
                if (branch1Id == null || branch2Id == null) {
                    logger.error("One or both branches not found: {} or {}", branch1, branch2);
                    return "";
                }
                RevCommit commit1 = revWalk.parseCommit(branch1Id);
                RevCommit commit2 = revWalk.parseCommit(branch2Id);

                // Use CanonicalTreeParser for each branch
                org.eclipse.jgit.treewalk.CanonicalTreeParser oldTreeIter = new org.eclipse.jgit.treewalk.CanonicalTreeParser();
                org.eclipse.jgit.treewalk.CanonicalTreeParser newTreeIter = new org.eclipse.jgit.treewalk.CanonicalTreeParser();
                try (var reader = repository.newObjectReader()) {
                    oldTreeIter.reset(reader, commit1.getTree().getId());
                    newTreeIter.reset(reader, commit2.getTree().getId());
                }

                try {
                    List<DiffEntry> diffs = git.diff()
                        .setOldTree(oldTreeIter)
                        .setNewTree(newTreeIter)
                        .call();

                    ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
                    DiffFormatter formatter = new DiffFormatter(outputStream);
                    formatter.setRepository(repository);
                    for (DiffEntry diff : diffs) {
                        formatter.format(diff);
                    }
                    String diffOutput = outputStream.toString();
                    logger.info("Generated diff between {} and {} for org: {}", branch1, branch2, orgName);
                    return diffOutput;
                } catch (org.eclipse.jgit.api.errors.GitAPIException e) {
                    logger.error("GitAPIException while diffing branches {} and {} for org {}: {}", branch1, branch2, orgName, e.getMessage());
                    return "";
                }
            }
        } catch (IOException e) {
            logger.error("Error getting diff between branches {} and {} for org {}: {}", 
                        branch1, branch2, orgName, e.getMessage());
            return "";
        }
    }
    
    /**
     * Get file content from a specific branch
     */
    public String getFileContent(String orgName, String branchName, String filePath, String basePath) {
        try {
            Path repoPath = Paths.get(basePath, orgName);
            Path fullFilePath = repoPath.resolve(filePath);
            
            if (!Files.exists(repoPath)) {
                logger.error("Repository does not exist for org: {}", orgName);
                return "";
            }
            
            try (Git git = Git.open(repoPath.toFile())) {
                // Switch to the specified branch
                git.checkout().setName(branchName).call();
                
                if (Files.exists(fullFilePath)) {
                    return Files.readString(fullFilePath);
                } else {
                    logger.warn("File {} does not exist in branch {} for org: {}", filePath, branchName, orgName);
                    return "";
                }
            }
        } catch (IOException | GitAPIException e) {
            logger.error("Error getting file content for {} in branch {} for org {}: {}", 
                        filePath, branchName, orgName, e.getMessage());
            return "";
        }
    }
    
    /**
     * Check if repository exists for an organization
     */
    public boolean repositoryExists(String orgName, String basePath) {
        Path repoPath = Paths.get(basePath, orgName);
        Path gitPath = repoPath.resolve(".git");
        return Files.exists(gitPath);
    }
    
    /**
     * Get current branch name
     */
    public String getCurrentBranch(String orgName, String basePath) {
        try {
            Path repoPath = Paths.get(basePath, orgName);
            
            if (!Files.exists(repoPath)) {
                logger.error("Repository does not exist for org: {}", orgName);
                return "";
            }
            
            try (Git git = Git.open(repoPath.toFile())) {
                return git.getRepository().getBranch();
            }
        } catch (IOException e) {
            logger.error("Error getting current branch for org {}: {}", orgName, e.getMessage());
            return "";
        }
    }

    /**
     * Get list of files in a specific branch (for CompareController)
     */
    public List<String> getFileList(Path orgDirectory, String branchName) {
        try {
            if (!Files.exists(orgDirectory)) {
                logger.error("Repository does not exist at: {}", orgDirectory);
                return List.of();
            }
            
            try (Git git = Git.open(orgDirectory.toFile())) {
                // Switch to the specified branch
                git.checkout().setName(branchName).call();
                
                return Files.walk(orgDirectory)
                           .filter(Files::isRegularFile)
                           .map(path -> orgDirectory.relativize(path).toString())
                           .filter(path -> !path.startsWith(".git"))
                           .collect(Collectors.toList());
            }
        } catch (IOException | GitAPIException e) {
            logger.error("Error getting file list for branch {}: {}", branchName, e.getMessage());
            return List.of();
        }
    }

    /**
     * Get diff for a specific file between two branches (for CompareController)
     */
    public DiffResult getFileDiff(Path orgDirectory, String sourceBranch, String targetBranch, String filePath) {
        try {
            if (!Files.exists(orgDirectory)) {
                logger.error("Repository does not exist at: {}", orgDirectory);
                return null;
            }
            
            try (Git git = Git.open(orgDirectory.toFile());
                 Repository repository = git.getRepository();
                 RevWalk revWalk = new RevWalk(repository)) {

                ObjectId sourceId = repository.resolve(sourceBranch);
                ObjectId targetId = repository.resolve(targetBranch);
                
                if (sourceId == null || targetId == null) {
                    logger.error("One or both branches not found: {} or {}", sourceBranch, targetBranch);
                    return null;
                }
                
                RevCommit sourceCommit = revWalk.parseCommit(sourceId);
                RevCommit targetCommit = revWalk.parseCommit(targetId);

                org.eclipse.jgit.treewalk.CanonicalTreeParser oldTreeIter = new org.eclipse.jgit.treewalk.CanonicalTreeParser();
                org.eclipse.jgit.treewalk.CanonicalTreeParser newTreeIter = new org.eclipse.jgit.treewalk.CanonicalTreeParser();
                
                try (var reader = repository.newObjectReader()) {
                    oldTreeIter.reset(reader, sourceCommit.getTree().getId());
                    newTreeIter.reset(reader, targetCommit.getTree().getId());
                }

                List<DiffEntry> diffs = git.diff()
                    .setOldTree(oldTreeIter)
                    .setNewTree(newTreeIter)
                    .setPathFilter(org.eclipse.jgit.treewalk.filter.PathFilter.create(filePath))
                    .call();

                if (diffs.isEmpty()) {
                    return new DiffResult(filePath, "", sourceBranch, targetBranch);
                }

                ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
                DiffFormatter formatter = new DiffFormatter(outputStream);
                formatter.setRepository(repository);
                
                for (DiffEntry diff : diffs) {
                    formatter.format(diff);
                }
                
                String diffText = outputStream.toString();
                return new DiffResult(filePath, diffText, sourceBranch, targetBranch);
                
            }
        } catch (IOException | GitAPIException e) {
            logger.error("Error getting file diff for {} between {} and {}: {}", 
                        filePath, sourceBranch, targetBranch, e.getMessage());
            return null;
        }
    }

    /**
     * Get all diffs between two branches (for CompareController)
     */
    public List<DiffResult> getAllDiffs(Path orgDirectory, String sourceBranch, String targetBranch) {
        try {
            if (!Files.exists(orgDirectory)) {
                logger.error("Repository does not exist at: {}", orgDirectory);
                return List.of();
            }
            
            try (Git git = Git.open(orgDirectory.toFile());
                 Repository repository = git.getRepository();
                 RevWalk revWalk = new RevWalk(repository)) {

                ObjectId sourceId = repository.resolve(sourceBranch);
                ObjectId targetId = repository.resolve(targetBranch);
                
                if (sourceId == null || targetId == null) {
                    logger.error("One or both branches not found: {} or {}", sourceBranch, targetBranch);
                    return List.of();
                }
                
                RevCommit sourceCommit = revWalk.parseCommit(sourceId);
                RevCommit targetCommit = revWalk.parseCommit(targetId);

                org.eclipse.jgit.treewalk.CanonicalTreeParser oldTreeIter = new org.eclipse.jgit.treewalk.CanonicalTreeParser();
                org.eclipse.jgit.treewalk.CanonicalTreeParser newTreeIter = new org.eclipse.jgit.treewalk.CanonicalTreeParser();
                
                try (var reader = repository.newObjectReader()) {
                    oldTreeIter.reset(reader, sourceCommit.getTree().getId());
                    newTreeIter.reset(reader, targetCommit.getTree().getId());
                }

                List<DiffEntry> diffs = git.diff()
                    .setOldTree(oldTreeIter)
                    .setNewTree(newTreeIter)
                    .call();

                List<DiffResult> results = new ArrayList<>();
                
                for (DiffEntry diff : diffs) {
                    String filePath = diff.getNewPath().equals("/dev/null") ? diff.getOldPath() : diff.getNewPath();
                    
                    ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
                    DiffFormatter formatter = new DiffFormatter(outputStream);
                    formatter.setRepository(repository);
                    formatter.format(diff);
                    
                    String diffText = outputStream.toString();
                    results.add(new DiffResult(filePath, diffText, sourceBranch, targetBranch));
                }
                
                return results;
                
            }
        } catch (IOException | GitAPIException e) {
            logger.error("Error getting all diffs between {} and {}: {}", 
                        sourceBranch, targetBranch, e.getMessage());
            return List.of();
        }
    }

    /**
     * Get file content from a specific branch using Path (for CompareController)
     */
    public FileContent getFileContent(Path orgDirectory, String branchName, String filePath) {
        try {
            if (!Files.exists(orgDirectory)) {
                logger.error("Repository does not exist at: {}", orgDirectory);
                return new FileContent(filePath, branchName, false);
            }
            
            try (Git git = Git.open(orgDirectory.toFile())) {
                // Switch to the specified branch
                git.checkout().setName(branchName).call();
                
                Path fullFilePath = orgDirectory.resolve(filePath);
                
                if (Files.exists(fullFilePath)) {
                    String content = Files.readString(fullFilePath);
                    return new FileContent(filePath, content, branchName);
                } else {
                    logger.warn("File {} does not exist in branch {}: {}", filePath, branchName, orgDirectory);
                    return new FileContent(filePath, branchName, false);
                }
            }
        } catch (IOException | GitAPIException e) {
            logger.error("Error getting file content for {} in branch {}: {}", 
                        filePath, branchName, e.getMessage());
            return new FileContent(filePath, branchName, false);
        }
    }
} 