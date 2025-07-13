package com.salesforce.codecompare.model;

public class DiffResult {
    private String filePath;
    private String diffText;
    private String sourceBranch;
    private String targetBranch;
    private boolean hasChanges;
    private int addedLines;
    private int removedLines;

    // Default constructor
    public DiffResult() {}

    // Constructor with parameters
    public DiffResult(String filePath, String diffText, String sourceBranch, String targetBranch) {
        this.filePath = filePath;
        this.diffText = diffText;
        this.sourceBranch = sourceBranch;
        this.targetBranch = targetBranch;
        this.hasChanges = diffText != null && !diffText.trim().isEmpty();
        calculateLineChanges();
    }

    // Calculate added and removed lines from diff text
    private void calculateLineChanges() {
        if (diffText == null) {
            this.addedLines = 0;
            this.removedLines = 0;
            return;
        }

        String[] lines = diffText.split("\n");
        int added = 0;
        int removed = 0;

        for (String line : lines) {
            if (line.startsWith("+") && !line.startsWith("+++")) {
                added++;
            } else if (line.startsWith("-") && !line.startsWith("---")) {
                removed++;
            }
        }

        this.addedLines = added;
        this.removedLines = removed;
    }

    // Getters and setters
    public String getFilePath() {
        return filePath;
    }

    public void setFilePath(String filePath) {
        this.filePath = filePath;
    }

    public String getDiffText() {
        return diffText;
    }

    public void setDiffText(String diffText) {
        this.diffText = diffText;
        this.hasChanges = diffText != null && !diffText.trim().isEmpty();
        calculateLineChanges();
    }

    public String getSourceBranch() {
        return sourceBranch;
    }

    public void setSourceBranch(String sourceBranch) {
        this.sourceBranch = sourceBranch;
    }

    public String getTargetBranch() {
        return targetBranch;
    }

    public void setTargetBranch(String targetBranch) {
        this.targetBranch = targetBranch;
    }

    public boolean isHasChanges() {
        return hasChanges;
    }

    public void setHasChanges(boolean hasChanges) {
        this.hasChanges = hasChanges;
    }

    public int getAddedLines() {
        return addedLines;
    }

    public void setAddedLines(int addedLines) {
        this.addedLines = addedLines;
    }

    public int getRemovedLines() {
        return removedLines;
    }

    public void setRemovedLines(int removedLines) {
        this.removedLines = removedLines;
    }

    @Override
    public String toString() {
        return "DiffResult{" +
                "filePath='" + filePath + '\'' +
                ", sourceBranch='" + sourceBranch + '\'' +
                ", targetBranch='" + targetBranch + '\'' +
                ", hasChanges=" + hasChanges +
                ", addedLines=" + addedLines +
                ", removedLines=" + removedLines +
                '}';
    }
} 