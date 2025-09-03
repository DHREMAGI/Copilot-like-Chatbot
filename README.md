                                    Copilot Like Chatbot
                                    
                                    
I create a chatbot that mimic like copilot

 In edge, the copilot analyze the current opening tab on the web page and give summaries of that page.
 These chatbot mainly focused on analysing dataset( eg; Shipment, Sales). The web pages shows limited records but this chatbot analyze full dataset by using API URL 
 Show output in both text as well as chart. 

METHODOLOGY:
   The Model only converts natural language into sql/pandas query. It never see our data
   The generated query will perform on the pandas code and generate output as both text as well as chart

TECHNOLOGY USED;
   platform : VS Code
   Programming language : Python #>!#.x
   model: GPT-40-mini


RUN MODULE:
   Step !: Store the dataset (sales.json and shipments.json) under the folder name "data"
   Step 2> Save your api key unser the .env file like (API_key+)
   step 3 : create virtual environment and activate that
   Step 4: install required libraries using "pip install -r requirements.txt"
   Step 5: Ru main.py as uvicorn main:app --reload
   Step 6 : Copy the API URL "http://localhost:8000"
   Step 7 : On that You will switch to any daaset using dropsown menu, resize the record size on the page and choose chart type
   Step 8 : on the bottom right corner you have ability to see the blue icon. If you click that, the chatbot will open and ask question in natural language it will give answer (the Chart is not visible for row wise questions).
       - You can drag that chatbot on any of the page  
 
