---
sidebar_position: 4
---

# Databases

![Alt Text](/img/Database_ERD_Diagram.png)

The diagram above shows the entity relationship diagram for the databases used in this project as well as the structure of the tables within the databases. A postgresSQL database will be used to handle storing user credentials, video questions, user answers and progress, saved videos and user video history. MongoDB will be used to handle storage of user analytics such as clicks and session times due to its ability to handle unstructured data well. The databases will be linked in order to collect analytics and observe trends related to different video and question types.