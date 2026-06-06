anchor tag for link website <a href="link/">name</a>

image tag<img src="img.png" alt="this is my picture">

radio= one option is correct in n questions



CSS



Inline CSS                                                                     Italic-->changeable  , in place of h1,2.. can use anything like element, button

<h1,2.. style="color:    ">paragraph</h1,2..>



Style Tag

<head><style>

reference(h1,2..){

color:your choice;

}

</style></head>



External CSS



make a notepad file syntax - name.css

then link it using - <link rel="stylesheet" href="name.css"> to html file

write reference{

color:choice;

}



Selector

                                                     in html file make id="name"/ class="name" for changing element

# for particular element

#id-name{ 
color:a;
 }



. for same heading

.class-name{
color:a; 
}

CSS Property

1.color  2.background-color  3.text-align - left, right, center
4.text-decoration - underline 
5.font-weight - (100-900) or normal/bold/bolder/lighter
6.font-family - arial
7.font-size - px
8.text-transform - uppercase/lowercase/capitalize


flex-direction: row,row-reverse ,column ,column-reverse

 justify-content -> alignment along the main-axis (flex-start,flex-end,center)

 align-item ->alignment along the cross axis(flex-start, flex-end,center)+

bootstrap


JAVASCRIPT

let arr=['a','b','c','d','e'];  /*/*print index no./*/*
for(let i in  arr){
console.log(i);
}

for(let i of arr){   /*/*print value /*/*
console.log(i);
}


let str="this is my house";
let str2="this is your house";

let a=str.length;
let b=str.toUpperCase();    //braces () used for making him a function
let c=b.toLowerCase();
let d=str.concat(str2);

console.log(a);
console.log(b);
cnsole.log(c);
console.log(d);

templates:

let s=prompt("Enter your name");
let age=Number(prompt('Enter your age"));

let output=`this is your name ${s} and your age ${age}.`
console.log(output);
`backtick`

let s=prompt("Enter your name");
let a=s.length;
let b=s.toLowerCase();
let out=`Name:@${b} and length is: ${a} `
console.log(out);

let a=document.querySelector("#p1")
a.tagName                                         (enter in console)
a.innerText                                         (enter in console)
a.innertext="what you want to replace"      (enter in console)
a.innerHtml="this is how to check <b>HTML TAG<b> (for bold use<b>) (enter in console)m,


Css
.style.color="red";
.style.fontSize="20px";
.style.textDecoration="underline";
.style.textAlign="center";

.style.width="200px";
.style.height="150px';
.style.padding="10px";
.style.margin="20px";
.style.border="2px solid black";
.style.borderRadius="10px";

.style.backgroundColor="blue";

.style.visibility="hidden";

.style.cursor="pointer";

  height: 100%;
    position: relative;
    margin-bottom: 0;
    margin-top: 0;
    overflow: hidden;
    padding-top: 20px;