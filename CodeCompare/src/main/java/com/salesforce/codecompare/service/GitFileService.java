package com.salesforce.codecompare.service;

import org.eclipse.jgit.diff.*;
import org.eclipse.jgit.lib.*;
import org.eclipse.jgit.revwalk.*;
import org.eclipse.jgit.treewalk.*;
import org.eclipse.jgit.treewalk.filter.PathFilter;

import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.util.Arrays;

@Service
public class GitFileService {

    public String getFileDiff(Repository repo, String branch1, String branch2, String filePath) throws Exception {
        ObjectId b1Id = repo.resolve(branch1);
        ObjectId b2Id = repo.resolve(branch2);

        try (RevWalk walk = new RevWalk(repo)) {
            RevCommit c1 = walk.parseCommit(b1Id);
            RevCommit c2 = walk.parseCommit(b2Id);
            RevTree t1 = c1.getTree();
            RevTree t2 = c2.getTree();

            try (ObjectReader reader = repo.newObjectReader()) {
                CanonicalTreeParser p1 = new CanonicalTreeParser();
                p1.reset(reader, t1);

                CanonicalTreeParser p2 = new CanonicalTreeParser();
                p2.reset(reader, t2);

                ByteArrayOutputStream out = new ByteArrayOutputStream();
                try (DiffFormatter df = new DiffFormatter(out)) {
                    df.setRepository(repo);
                    df.setDiffComparator(RawTextComparator.DEFAULT);
                    df.setDetectRenames(true);
                    df.format(p1, p2);

                    String fullDiff = out.toString();
                    return Arrays.stream(fullDiff.split("diff --git"))
                            .filter(block -> block.contains(filePath))
                            .map(block -> "diff --git" + block)
                            .findFirst()
                            .orElse("No diff found.");
                }
            }
        }
    }

    public String getFileContent(Repository repo, String branch, String filePath) throws Exception {
        ObjectId treeId = repo.resolve(branch + "^{tree}");

        try (RevWalk walk = new RevWalk(repo)) {
            RevTree tree = walk.parseTree(treeId);
            try (TreeWalk tw = new TreeWalk(repo)) {
                tw.addTree(tree);
                tw.setRecursive(true);
                tw.setFilter(PathFilter.create(filePath));

                Boolean isFilePresent = tw.next();
                if (!isFilePresent) {
                    return null;
                }

                ObjectId blobId = tw.getObjectId(0);
                ObjectLoader loader = repo.open(blobId);
                return new String(loader.getBytes(), "UTF-8");
            }
        }
    }
}
