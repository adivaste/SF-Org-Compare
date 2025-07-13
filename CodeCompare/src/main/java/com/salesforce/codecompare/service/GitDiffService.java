package com.salesforce.codecompare.service;

import com.salesforce.codecompare.model.DirectoryNode;
import com.salesforce.codecompare.model.FileStatusEntry;
import org.eclipse.jgit.lib.*;
import org.eclipse.jgit.revwalk.*;
import org.eclipse.jgit.treewalk.TreeWalk;

import java.io.File;
import java.util.*;

import org.springframework.stereotype.Service;

@Service
public class GitDiffService {

    public List<FileStatusEntry> getUnionFileStatus(Repository repository, String branch1, String branch2) throws Exception {
        Map<String, ObjectId> map1 = getFileBlobs(repository, branch1);
        Map<String, ObjectId> map2 = getFileBlobs(repository, branch2);

        Set<String> allPaths = new TreeSet<>();
        allPaths.addAll(map1.keySet());
        allPaths.addAll(map2.keySet());

        List<FileStatusEntry> result = new ArrayList<>();

        for (String path : allPaths) {
            ObjectId blob1 = map1.get(path);
            ObjectId blob2 = map2.get(path);
            String status;

            if (blob1 != null && blob2 != null) {
                status = blob1.equals(blob2) ? "matched" : "modified";
            } else if (blob1 != null) {
                status = "onlyInSource";
            } else {
                status = "onlyInTarget";
            }

            String fileName = new File(path).getName();
            result.add(new FileStatusEntry(path, fileName, status));
        }

        return result;
    }

    private Map<String, ObjectId> getFileBlobs(Repository repo, String branch) throws Exception {
        Map<String, ObjectId> map = new HashMap<>();
        ObjectId treeId = repo.resolve(branch + "^{tree}");
        try (RevWalk revWalk = new RevWalk(repo)) {
            RevTree tree = revWalk.parseTree(treeId);
            try (TreeWalk walk = new TreeWalk(repo)) {
                walk.addTree(tree);
                walk.setRecursive(true);
                while (walk.next()) {
                    map.put(walk.getPathString(), walk.getObjectId(0));
                }
            }
        }
        return map;
    }

    public DirectoryNode buildDirectoryTree(List<FileStatusEntry> files) {
        DirectoryNode root = new DirectoryNode("/", "directory");

        for (FileStatusEntry file : files) {
            String[] parts = file.getPath().split("/");
            DirectoryNode current = root;

            for (int i = 0; i < parts.length; i++) {
                String part = parts[i];
                Optional<DirectoryNode> existing = current.getChildren().stream()
                        .filter(child -> child.getName().equals(part))
                        .findFirst();

                if (i == parts.length - 1) {
                    // It's a file
                    if (!existing.isPresent()) {
                        DirectoryNode fileNode = new DirectoryNode(part, "file");
                        fileNode.setStatus(file.getStatus());
                        fileNode.setPath(file.getPath());
                        current.addChild(fileNode);
                    }
                } else {
                    // It's a directory
                    if (!existing.isPresent()) {
                        DirectoryNode dirNode = new DirectoryNode(part, "directory");
                        current.addChild(dirNode);
                        current = dirNode;
                    } else {
                        current = existing.get();
                    }
                }
            }
        }

        return root;
    }

}
