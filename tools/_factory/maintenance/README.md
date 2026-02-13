\# ScopedLabs Maintenance System  

(Tiering, Inventory, Protection)



Location:

E:\\ScopedLabs\\tools\\\_factory\\maintenance\\



This folder contains the canonical scripts used to manage:



• Free vs Pro tiering  

• Tool inventory  

• Coverage auditing  

• Protection verification  



These scripts keep ScopedLabs consistent as the tool count grows.



--------------------------------------------------



FILES IN THIS FOLDER



--------------------------------------------------



free\_vs\_pro\_tools.txt   (SOURCE OF TRUTH)

Defines which tools are FREE and which are PRO.



This is the ONLY file you manually edit.



Format:



category-name

FREE

slug-one

slug-two

slug-three

PRO

slug-four

slug-five



Repeat for every category.



Rules:

\- Slugs must match folder names exactly

\- Lowercase + hyphenated

\- 10 categories × 10 tools = 100 tools



Example:



access-control

FREE

credential-format

fail-safe-fail-secure

reader-type-selector

PRO

door-count-planner

elevator-reader-count



--------------------------------------------------



apply-tiering.ps1   (MAIN WRITER)



Reads free\_vs\_pro\_tools.txt and applies locking/unlocking to tools.



This is the ONLY script that modifies tool HTML.



Run:



.\\apply-tiering.ps1



Expected output:

Scanned: 100

Updated: X

Skipped/no change: X



If Updated = 0, everything already matches.



--------------------------------------------------



audit-tier-list.ps1   (COVERAGE CHECK)



Verifies that every category has exactly 10 tools listed.



Run:



.\\audit-tier-list.ps1



Goal:

FolderCount = 10

ListCount = 10

MissingCount = 0



--------------------------------------------------



inventory-slugs.ps1   (REBUILD INVENTORY)



Scans disk and generates a list of existing tool slugs.



Use after:

\- Adding tools

\- Renaming folders

\- Deleting tools



Run:



.\\inventory-slugs.ps1



Outputs:

\_inventory\_slugs.txt



--------------------------------------------------



\_inventory\_slugs.txt   (AUTO-GENERATED)



Snapshot of what tools currently exist on disk.

Never edited manually.



--------------------------------------------------



scan-missing-protection.ps1   (PROTECTION AUDIT)



Finds PRO tools missing gating.



Run:



.\\scan-missing-protection.ps1



If a tool appears here:

Re-run apply-tiering.ps1



--------------------------------------------------



NORMAL WORKFLOW



1\) Rebuild inventory



.\\inventory-slugs.ps1



2\) Verify list coverage



.\\audit-tier-list.ps1



3\) Apply tiering



.\\apply-tiering.ps1



--------------------------------------------------



TROUBLESHOOTING



Pro tool shows unlocked:

\- Run scan-missing-protection.ps1

\- Then apply-tiering.ps1



Free tool shows locked:

\- Check slug placement in free\_vs\_pro\_tools.txt

\- Re-run apply-tiering.ps1



ListCount = 0:

Your list formatting is wrong.

Category names, FREE, and PRO must be on their own lines.



--------------------------------------------------



GOLDEN RULE



Only one script is allowed to modify tool HTML:



apply-tiering.ps1



Everything else is read-only auditing.



--------------------------------------------------



MENTAL MODEL



free\_vs\_pro\_tools.txt

→ defines truth



apply-tiering.ps1

→ enforces truth



other scripts

→ verify truth



--------------------------------------------------



ScopedLabs Maintenance System

Stable • Predictable • Scalable



