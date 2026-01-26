# Reasoning

Autogenerative models are great at generating the next token
But it can jump to the wrong answer with more complex tasks
How can we harness the power?

## Chain of Thought

provides a step-by-step logical reasoning in the prompt
natural language that does not depend on a linguistic style
helps understand the reasoning behind the model, and where it went wrong

only emerged in models with more than 100B parameters

self-consistency
- ask it multiple times with varying temperature
- % of correct answers provides confidence level

softmax
- uses e^z
- because logit can be any number, but probability needs to be positive
- the exponent amplifies the more probable outcome

temperature
- divides the logit into a number
- higher temp, gap between the probabilities decreases

problems
- one point in hallucination breaks it
- cannot go back if reasoning leads to a dead end

## ReAct 

combining reasoning and acting

reasoning > uses external source to verify its reasoning
acting > guides actions to the right path using reasoning

action world = Ct = (o1, a1, o2, a2 ..... at-1, ot)
language world = where thought it treated as an action

framework for models to work with
while it uses CoT, CoT sometimes had better results
because its structure reduced flexibility in reasoning

finetuning react led to better performance

ALFWorld - dataset exploring simulated world with text
Webshop - dataset to help users shop what they want

## Reasoning By Planning

LLMs need a world model to understand the current state

MCTS
- states are represented as nodes
- choosing the best possible option at each state

UCT function
- used to choose which node to go to
- average score + ln(N) / ni

1. selection - root to leaf using UCT function 
2. expansion - expands the leaf with more moves
3. simulation - random trials till the end / uses model to judge the score of current state
4. back propagation to update the rewards for the node path

we need to define state that an LLM can understand
this is expressed as a string describing the current state
however, the focus is still on the action / thought

Q(s,a) - mean expected reward for state s and action a

1. selection - same, but with Q(s,a)
2. expansion - LLM decides to think of k potential moves + immediate reward function to replace Q(s,a)
3. simulation - reasoning done till the one arrives at the answer
4. backpropagation - reward function is used to update Q values

reward function
- log likelihood of all tokens
- asking itself to give a score

after certain number of iterations, either Q or N is chosen to go to the best path 


