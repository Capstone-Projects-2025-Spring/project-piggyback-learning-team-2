export const videos = [
    {
      id: 1,
      title: "Why Do We Get Hiccups? | Body Science for Kids",
      url: "https://youtu.be/9e5lcQycf2M",
      embed: "9e5lcQycf2M"
    },
    {
      id: 2,
      title: "What Causes Thunder and Lightning? | SciShow Kids",
      url: "https://youtu.be/fEiVi9TB_RQ",
      embed: "fEiVi9TB_RQ"
    },
    {
      id: 3,
      title: "How Do Airplanes Fly?",
      url: "https://youtu.be/Gg0TXNXgz-w",
      embed: "Gg0TXNXgz-w"
    },
    {
      id: 4,
      title: "Why Do We Get Hiccups? | Body Science for Kids",
      url: "https://youtu.be/9e5lcQycf2M",
      embed: "9e5lcQycf2M"
    }
  ];
  
  export const questions = [
    // Questions for "Why Do We Get Hiccups?"
    {
      id: 1,
      type: "image",
      title: "Who is Squeeks? (Click on the Image!)",
      timestamp: 20,
      trigger_count: 0,
      correct_answer: "",
      video_id: 1
    },
    {
      id: 2,
      type: "multipleChoice",
      title: "What muscle is responsible for causing hiccups?",
      timestamp: 80,
      trigger_count: 1,
      correct_answer: "B",
      video_id: 1
    },
    {
      id: 3,
      type: "multipleChoice",
      title: "Which of the following is NOT a common cause of hiccups?",
      timestamp: 90,
      trigger_count: 2,
      correct_answer: "D",
      video_id: 1
    },
    {
      id: 4,
      type: "multipleChoice",
      title: 'Why do hiccups make a "hic" sound?',
      timestamp: 118,
      trigger_count: 3,
      correct_answer: "A",
      video_id: 1
    },
    {
      id: 5,
      type: "end",
      title: "Here's How You Did!",
      timestamp: 170,
      trigger_count: 4,
      correct_answer: "",
      video_id: 1
    },
  
    // Questions for "What Causes Thunder and Lightning?"
    {
      id: 6,
      type: "multipleChoice",
      title: "What causes the sound of thunder?",
      timestamp: 40,
      trigger_count: 0,
      correct_answer: "B",
      video_id: 2
    },
    {
      id: 7,
      type: "multipleChoice",
      title: "Lightning always strikes from the cloud to the ground.",
      timestamp: 80,
      trigger_count: 1,
      correct_answer: "B",
      video_id: 2
    },
    {
      id: 8,
      type: "multipleChoice",
      title: "Which of the following is a type of lightning?",
      timestamp: 120,
      trigger_count: 2,
      correct_answer: "D",
      video_id: 2
    },
    {
      id: 9,
      type: "end",
      title: "Here's How You Did!",
      timestamp: 215,
      trigger_count: 4,
      correct_answer: "",
      video_id: 2
    },
  
    // Questions for "How Do Airplanes Fly?"
    {
      id: 10,
      type: "multipleChoice",
      title: "What principle explains how airplane wings generate lift?",
      timestamp: 35,
      trigger_count: 0,
      correct_answer: "B",
      video_id: 3
    },
    {
      id: 11,
      type: "multipleChoice",
      title: "Flaps on the wings help airplanes to take off and land.",
      timestamp: 70,
      trigger_count: 1,
      correct_answer: "A",
      video_id: 3
    },
    {
      id: 12,
      type: "multipleChoice",
      title: "Which factor does NOT affect the lift of an airplane?",
      timestamp: 110,
      trigger_count: 2,
      correct_answer: "C",
      video_id: 3
    },
    {
      id: 13,
      type: "end",
      title: "Here's How You Did!",
      timestamp: 185,
      trigger_count: 4,
      correct_answer: "",
      video_id: 3
    },
  
    // Questions for "Why Do We Get Hiccups?" (again)
    {
      id: 14,
      type: "image",
      title: "Who is Squeeks? (Click on the Image!)",
      timestamp: 20,
      trigger_count: 0,
      correct_answer: "",
      video_id: 4
    },
    {
      id: 15,
      type: "multipleChoice",
      title: "What muscle is responsible for causing hiccups?",
      timestamp: 80,
      trigger_count: 1,
      correct_answer: "B",
      video_id: 4
    },
    {
      id: 16,
      type: "multipleChoice",
      title: "Which of the following is NOT a common cause of hiccups?",
      timestamp: 90,
      trigger_count: 2,
      correct_answer: "D",
      video_id: 4
    },
    {
      id: 17,
      type: "multipleChoice",
      title: 'Why do hiccups make a "hic" sound?',
      timestamp: 118,
      trigger_count: 3,
      correct_answer: "A",
      video_id: 4
    },
    {
      id: 18,
      type: "end",
      title: "Here's How You Did!",
      timestamp: 170,
      trigger_count: 4,
      correct_answer: "",
      video_id: 4
    }
  ];
  
  export const questionOptions = [
    // Options for "What muscle is responsible for causing hiccups?"
    { question_id: 2, value: "A", label: "Heart" },
    { question_id: 2, value: "B", label: "Diaphragm" },
    { question_id: 2, value: "C", label: "Stomach" },
    { question_id: 2, value: "D", label: "Lungs" },
  
    // Options for "Which of the following is NOT a common cause of hiccups?"
    { question_id: 3, value: "A", label: "Eating too quickly" },
    { question_id: 3, value: "B", label: "Drinking carbonated beverages" },
    { question_id: 3, value: "C", label: "Holding your breath" },
    { question_id: 3, value: "D", label: "Sudden excitement" },
  
    // Options for 'Why do hiccups make a "hic" sound?'
    { question_id: 4, value: "A", label: "Air quickly rushes into the lungs" },
    { question_id: 4, value: "B", label: "The vocal cords suddenly close" },
    { question_id: 4, value: "C", label: "The stomach contracts" },
    { question_id: 4, value: "D", label: "The heart skips a beat" },
  
    // Options for "What causes the sound of thunder?"
    { question_id: 6, value: "A", label: "Clouds colliding" },
    { question_id: 6, value: "B", label: "Lightning heating the air rapidly" },
    { question_id: 6, value: "C", label: "Rain hitting the ground" },
    { question_id: 6, value: "D", label: "Wind speeds increasing" },
  
    // Options for "Lightning always strikes from the cloud to the ground."
    { question_id: 7, value: "A", label: "True" },
    { question_id: 7, value: "B", label: "False" },
  
    // Options for "Which of the following is a type of lightning?"
    { question_id: 8, value: "A", label: "Sheet lightning" },
    { question_id: 8, value: "B", label: "Forked lightning" },
    { question_id: 8, value: "C", label: "Ball lightning" },
    { question_id: 8, value: "D", label: "All of the above" },
  
    // Options for "What principle explains how airplane wings generate lift?"
    { question_id: 10, value: "A", label: "Newton's Third Law" },
    { question_id: 10, value: "B", label: "Bernoulli's Principle" },
    { question_id: 10, value: "C", label: "Pythagorean Theorem" },
    { question_id: 10, value: "D", label: "Archimedes' Principle" },
  
    // Options for "Flaps on the wings help airplanes to take off and land."
    { question_id: 11, value: "A", label: "True" },
    { question_id: 11, value: "B", label: "False" },
  
    // Options for "Which factor does NOT affect the lift of an airplane?"
    { question_id: 12, value: "A", label: "Wing shape" },
    { question_id: 12, value: "B", label: "Air speed" },
    { question_id: 12, value: "C", label: "Engine power" },
    { question_id: 12, value: "D", label: "Air density" },
  
    // Options for "What muscle is responsible for causing hiccups?" (for video 4)
    { question_id: 15, value: "A", label: "Heart" },
    { question_id: 15, value: "B", label: "Diaphragm" },
    { question_id: 15, value: "C", label: "Stomach" },
    { question_id: 15, value: "D", label: "Lungs" },
  
    // Options for "Which of the following is NOT a common cause of hiccups?" (for video 4)
    { question_id: 16, value: "A", label: "Eating too quickly" },
    { question_id: 16, value: "B", label: "Drinking carbonated beverages" },
    { question_id: 16, value: "C", label: "Holding your breath" },
    { question_id: 16, value: "D", label: "Sudden excitement" },
  
    // Options for 'Why do hiccups make a "hic" sound?' (for video 4)
    { question_id: 17, value: "A", label: "Air quickly rushes into the lungs" },
    { question_id: 17, value: "B", label: "The vocal cords suddenly close" },
    { question_id: 17, value: "C", label: "The stomach contracts" },
    { question_id: 17, value: "D", label: "The heart skips a beat" }
  ];




  // //  Why Do We Get Hiccups? | Body Science for Kids     embed: 9e5lcQycf2M     link: https://youtu.be/9e5lcQycf2M
  //   const questionsData = React.useMemo(() => [
  //     {
  //       id: "question1",
  //       type: "image",
  //       title: "Who is Squeeks? (Click on the Image!)",
  //       otherTimeStamp: 20,
  //       someTriggerCount: 0,
  //       correctAnswer: ""
  //     },
  //     {
  //       id: "question2",
  //       type: "multipleChoice",
  //       title: "What muscle is responsible for causing hiccups?",
  //       options: [
  //         { value: "A", label: "Heart" },
  //         { value: "B", label: "Diaphragm" },
  //         { value: "C", label: "Stomach" },
  //         { value: "D", label: "Lungs" }
  //       ],
  //       otherTimeStamp: 80,
  //       someTriggerCount: 1,
  //       correctAnswer: "B"
  //     },
  //     {
  //       id: "question3",
  //       type: "multipleChoice",
  //       title: "Which of the following is NOT a common cause of hiccups?",
  //       options: [
  //         { value: "A", label: "Eating too quickly" },
  //         { value: "B", label: "Drinking carbonated beverages" },
  //         { value: "C", label: "Holding your breath" },
  //         { value: "D", label: "Sudden excitement" }
  //       ],
  //       otherTimeStamp: 90,
  //       someTriggerCount: 2,
  //       correctAnswer: "D"
  //     },
  //     {
  //       id: "question4",
  //       type: "multipleChoice",
  //       title: 'Why do hiccups make a "hic" sound?',
  //       options: [
  //         { value: "A", label: "Air quickly rushes into the lungs" },
  //         { value: "B", label: "The vocal cords suddenly close" },
  //         { value: "C", label: "The stomach contracts" },
  //         { value: "D", label: "The heart skips a beat" }
  //       ],
  //       otherTimeStamp: 118,
  //       someTriggerCount: 3,
  //       correctAnswer: "A"
  //     },
  //     {
  //       id: "end",
  //       type: "end",
  //       title: "Here's How You Did!",
  //       otherTimeStamp: 170,
  //       someTriggerCount: 4,
  //       correctAnswer: ""
  //     }
  //   ], []);
  
    // // Water Cycle | How the Hydrologic Cycle Works     embed: al-do-HGuIk    link: https://youtu.be/al-do-HGuIk
    // const questionsData = React.useMemo(() => [
    //   {
    //     id: "question1",
    //     type: "multipleChoice",
    //     title: "What is the process called when water vapor cools and turns back into liquid?",
    //     options: [
    //       { value: "A", label: "Evaporation" },
    //       { value: "B", label: "Condensation" },
    //       { value: "C", label: "Precipitation" },
    //       { value: "D", label: "Collection" }
    //     ],
    //     otherTimeStamp: 30,
    //     someTriggerCount: 0,
    //     correctAnswer: "B"
    //   },
    //   {
    //     id: "question2",
    //     type: "multipleChoice",
    //     title: "The sun is the primary source of energy driving the water cycle.",
    //     options: [
    //       { value: "A", label: "True" },
    //       { value: "B", label: "False" }
    //     ],
    //     otherTimeStamp: 60,
    //     someTriggerCount: 1,
    //     correctAnswer: "A"
    //   },
    //   {
    //     id: "question3",
    //     type: "multipleChoice",
    //     title: "Which stage of the water cycle involves water soaking into the ground?",
    //     options: [
    //       { value: "A", label: "Runoff" },
    //       { value: "B", label: "Infiltration" },
    //       { value: "C", label: "Transpiration" },
    //       { value: "D", label: "Condensation" }
    //     ],
    //     otherTimeStamp: 90,
    //     someTriggerCount: 2,
    //     correctAnswer: "B"
    //   },
    //   {
    //     id: "end",
    //     type: "end",
    //     title: "Here's How You Did!",
    //     otherTimeStamp: 400,
    //     someTriggerCount: 4,
    //     correctAnswer: ""
    //   }
    // ], []);
    
  
  
  
  
    // // What Causes Thunder and Lightning? (SciShow Kids)     embed: fEiVi9TB_RQ     link: https://youtu.be/fEiVi9TB_RQ
    // const questionsData = React.useMemo(() => [
    //   {
    //     id: "question1",
    //     type: "multipleChoice",
    //     title: "What causes the sound of thunder?",
    //     options: [
    //       { value: "A", label: "Clouds colliding" },
    //       { value: "B", label: "Lightning heating the air rapidly" },
    //       { value: "C", label: "Rain hitting the ground" },
    //       { value: "D", label: "Wind speeds increasing" }
    //     ],
    //     otherTimeStamp: 40,
    //     someTriggerCount: 0,
    //     correctAnswer: "B"
    //   },
    //   {
    //     id: "question2",
    //     type: "multipleChoice",
    //     title: "Lightning always strikes from the cloud to the ground.",
    //     options: [
    //       { value: "A", label: "True" },
    //       { value: "B", label: "False" }
    //     ],
    //     otherTimeStamp: 80,
    //     someTriggerCount: 1,
    //     correctAnswer: "B"
    //   },
    //   {
    //     id: "question3",
    //     type: "multipleChoice",
    //     title: "Which of the following is a type of lightning?",
    //     options: [
    //       { value: "A", label: "Sheet lightning" },
    //       { value: "B", label: "Forked lightning" },
    //       { value: "C", label: "Ball lightning" },
    //       { value: "D", label: "All of the above" }
    //     ],
    //     otherTimeStamp: 120,
    //     someTriggerCount: 2,
    //     correctAnswer: "D"
    //   },
    //   {
    //     id: "end",
    //     type: "end",
    //     title: "Here's How You Did!",
    //     otherTimeStamp: 215,
    //     someTriggerCount: 4,
    //     correctAnswer: ""
    //   }
    // ], []);
  
  
  
    
    // // How Do Airplanes Fly?     embed: Gg0TXNXgz-w     link: https://youtu.be/Gg0TXNXgz-w
  
    // const questionsData = React.useMemo(() => [
    //   {
    //     id: "question1",
    //     type: "multipleChoice",
    //     title: "What principle explains how airplane wings generate lift?",
    //     options: [
    //       { value: "A", label: "Newton's Third Law" },
    //       { value: "B", label: "Bernoulli's Principle" },
    //       { value: "C", label: "Pythagorean Theorem" },
    //       { value: "D", label: "Archimedes' Principle" }
    //     ],
    //     otherTimeStamp: 35,
    //     someTriggerCount: 0,
    //     correctAnswer: "B"
    //   },
    //   {
    //     id: "question2",
    //     type: "multipleChoice",
    //     title: "Flaps on the wings help airplanes to take off and land.",
    //     options: [
    //       { value: "A", label: "True" },
    //       { value: "B", label: "False" }
    //     ],
    //     otherTimeStamp: 70,
    //     someTriggerCount: 1,
    //     correctAnswer: "A"
    //   },
    //   {
    //     id: "question3",
    //     type: "multipleChoice",
    //     title: "Which factor does NOT affect the lift of an airplane?",
    //     options: [
    //       { value: "A", label: "Wing shape" },
    //       { value: "B", label: "Air speed" },
    //       { value: "C", label: "Engine power" },
    //       { value: "D", label: "Air density" }
    //     ],
    //     otherTimeStamp: 110,
    //     someTriggerCount: 2,
    //     correctAnswer: "C"
    //   },
    //   {
    //     id: "end",
    //     type: "end",
    //     title: "Here's How You Did!",
    //     otherTimeStamp: 185,
    //     someTriggerCount: 4,
    //     correctAnswer: ""
    //   }
    // ], []);
  