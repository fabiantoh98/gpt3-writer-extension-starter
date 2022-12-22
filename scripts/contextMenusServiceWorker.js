const getKey = () => {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['openai-key'], (result)=>{
            if (result['openai-key']){
                const decodedKey = atob(result['openai-key']);
                console.log(decodedKey);
                resolve(decodedKey);
            }
        })
    })
}

const sendMessage = (content) => {
    chrome.tabs.query({ active: true, currentWindow: true}, (tabs)=>{
        const activeTab = tabs[0].id;
        console.log(activeTab);
        console.log(content);
        chrome.tabs.sendMessage(
            activeTab,
            {message: 'inject', content: content},
            (response) => {
                if (response.status === "failed") {
                    console.log('injection failed');
                }
            }
        );
    });
};

const generate = async(prompt) =>{
    const key = await getKey();
    const url = 'https://api.openai.com/v1/completions';

    const completionResponse = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
            model: 'text-davinci-003',
            prompt: prompt,
            max_tokens: 250,
            temperature: 0.7,
        })
    });
    const completion = await completionResponse.json();
    console.log(completion);
    return completion.choices.pop();
};

const generateCompletionAction = async (info) => {
    try{

        sendMessage('generating...');

        const { selectionText } = info;
        const basePromptPrefix = `
        Tell me a bible verse with the topic below:
        
        topic:
        `;
        const baseCompletion = await generate(`${basePromptPrefix}${selectionText}`);
        console.log("base output")
        console.log(baseCompletion.text)
        const secondPrompt = `
            Take the topic and verse below and generate an explanation for the verse used:
            
            topic: ${selectionText}

            verse: ${baseCompletion.text}

            explanation:
            `;
        const secondPromptCompletion = await generate(secondPrompt);
        console.log("second output")
        console.log(secondPromptCompletion.text)
        sendMessage(selectionText + '\n' + baseCompletion.text + '\n' +secondPromptCompletion.text);
    }
    catch (error){
        console.log(error);
        sendMessage(error.toString());
    }
};

chrome.runtime.onInstalled.addListener(()=> {
    chrome.contextMenus.create({
        id: 'context-run',
        title: 'Link to Bible',
        contexts: ['selection'],
    });
});

chrome.contextMenus.onClicked.addListener(generateCompletionAction);