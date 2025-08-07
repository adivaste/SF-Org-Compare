package com.salesforce.codecompare.controller;

import com.salesforce.codecompare.model.DirectoryNode;
import com.salesforce.codecompare.model.FileDiffRequest;
import com.salesforce.codecompare.model.FileStatusEntry;
import com.salesforce.codecompare.service.GitDiffService;
import com.salesforce.codecompare.service.GitFileService;

import org.eclipse.jgit.lib.Repository;
import org.eclipse.jgit.storage.file.FileRepositoryBuilder;

import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.util.List;
import java.util.Map;
import java.util.HashMap;


@RestController
@RequestMapping("/api/git")
@CrossOrigin(origins = "http://localhost:5173")
public class GitDiffController {

    private final GitDiffService diffService;
    private final GitFileService fileService;
    private final String repoBasePath = "E:\\Work\\Exceller-Tech\\gitCompareRoot";

    public GitDiffController(GitDiffService diffService, GitFileService fileService) {
        this.diffService = diffService;
        this.fileService = fileService;
    }

    private Repository openRepo(String orgName) throws Exception {
        String repoPath = repoBasePath + "\\" + orgName + "\\.git";
        return new FileRepositoryBuilder().setGitDir(new File(repoPath)).build();
    }

    @GetMapping("/status")
    public List<FileStatusEntry> getFileStatus(
            @RequestParam String org,
            @RequestParam String branch1,
            @RequestParam String branch2) throws Exception {

        try (Repository repo = openRepo(org)) {
            return diffService.getUnionFileStatus(repo, branch1, branch2);
        }
    }

    @GetMapping("/status-tree")
    public DirectoryNode getFileStatusTree(
            @RequestParam String org,
            @RequestParam String branch1,
            @RequestParam String branch2) throws Exception {

        try (Repository repo = openRepo(org)) {
            List<FileStatusEntry> flatList = diffService.getUnionFileStatus(repo, branch1, branch2);
            return diffService.buildDirectoryTree(flatList);
        }
    }


    @PostMapping("/diff")
    public String getDiff(@RequestBody FileDiffRequest req, @RequestParam String org) throws Exception {
        try (Repository repo = openRepo(org)) {
            return fileService.getFileDiff(repo, req.getBranch1(), req.getBranch2(), req.getFilePath());
        }
    }

    @GetMapping("/file")
    public Map<String, String> getFileContent(
            @RequestParam String org,
            @RequestParam String sourceBranch,
            @RequestParam String targetBranch,
            @RequestParam String filePath) throws Exception {

        try (Repository repo = openRepo(org)) {

            String sourceFileContent = fileService.getFileContent(repo, sourceBranch, filePath);
            String targetFileContent = fileService.getFileContent(repo, targetBranch, filePath);

            Map<String, String> result = new HashMap<>();
            result.put("source", sourceFileContent);
            result.put("target", targetFileContent);

            return result;
        }
    }
}
