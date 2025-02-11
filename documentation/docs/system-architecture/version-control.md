git b---
sidebar_position: 5
---

# Version Control

This project will use Github and git for version control. The standard procedure for branch creation involves creating a branch from main, or from whichever exisitng branch is closest/most relevant to the intended functionality of the branch (for example, a branch focused on UI may branch from another branch focused on developing UI if those changes have not been merged to main yet so they can have a bigger picture of the UI to work with as the develop). The branches will be named based on the task or story the branch is working on, such as Landing_Page_UI or Question_Text_To_Speech.

## Branch Protection

This project has three rules for branch protection:
1. A pull request is required to merge the contents of a branch with main.
2. Two approvals of a pull request are required before merging of a branch is allowed.
3. Only admins and users with bypass privileges can delete branches.


## Docusaurus Build
The Docusaurus will be built from the gh-pages branch based on the contents of the main branch, using the text and configuration details from the Markdown and JSON files to build an HTML-based documentation website for this project. 

