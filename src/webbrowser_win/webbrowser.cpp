/***** < ivan *****/
#include "webbrowser.h"
#include <QLayout>
#include <QToolButton>
#include <QLineEdit>
#include <QWebView>
#include <QWebFrame>
#include <QWebInspector>
#include <QSplitter>
#include <QTimer>
#include "../phantom.cpp"

WebBrowser* WebBrowser::instance = 0;

void WebBrowser::run(QWebPage *phantomPage, WebPage *webpage) {
    if (instance == 0) {
        instance = new WebBrowser();

        phantomPage->settings()->setAttribute(QWebSettings::DeveloperExtrasEnabled, true);
        instance->phantomInspector->setPage(phantomPage);
        if (Phantom::instance()->config()->remoteDebugPort() != -1) {
            instance->phantomInspector->hide();
        }
        else {
            instance->phantomInspector->setVisible(true);
            // we have to delay inspectors setup because they are not loaded immediately
            QTimer::singleShot(100, instance, SLOT(setupInspectors()));
        }

        setPage(webpage);

        instance->showMaximized();
    }
}

void WebBrowser::setPage(WebPage* webpage) {
    if (instance != 0 && webpage != 0) { // integrate into browser
        QWebPage *page = webpage->mainFrame()->page();
        instance->browser->setPage(page);
        page->settings()->setAttribute(QWebSettings::DeveloperExtrasEnabled, true);
        page->mainFrame()->setScrollBarPolicy(Qt::Horizontal, Qt::ScrollBarAsNeeded);
        page->mainFrame()->setScrollBarPolicy(Qt::Vertical, Qt::ScrollBarAsNeeded);
        instance->inspector->setPage(page);
        instance->inspector->setVisible(false);
        instance->inspector->setVisible(true);

        instance->backButton->setDefaultAction(instance->browser->pageAction(QWebPage::Back));
        instance->forwardButton->setDefaultAction(instance->browser->pageAction(QWebPage::Forward));
        instance->reloadButton->setDefaultAction(instance->browser->pageAction(QWebPage::Reload));
    }
    else if (webpage != 0) { // generate new widget
        QWebPage *page = webpage->mainFrame()->page();
        page->settings()->setAttribute(QWebSettings::DeveloperExtrasEnabled, true);
        page->mainFrame()->setScrollBarPolicy(Qt::Horizontal, Qt::ScrollBarAsNeeded);
        page->mainFrame()->setScrollBarPolicy(Qt::Vertical, Qt::ScrollBarAsNeeded);
        QWebView* view = new QWebView();
        view->show();
        view->setPage(page);
    }
}

void WebBrowser::setupInspectors() {
    // we want to show [console] tab on phantom's inspector
    QWebView* wv =(QWebView*) phantomInspector->findChild<QWidget *>();
    if (wv != 0) {
        phantomInspector->setFocus(Qt::OtherFocusReason);
        wv->page()->mainFrame()->evaluateJavaScript(
            "document.addEventListener('DOMContentLoaded',function(){" \
                "setTimeout(function(){" \
                    "document.querySelector('.toolbar-item.elements').style.display = 'none';" \
                    "document.querySelector('.toolbar-item.resources').style.display = 'none';" \
                    "document.querySelector('.toolbar-item.network').style.display = 'none';" \
                    "document.querySelector('.toolbar-item.timeline').style.display = 'none';" \
                    "document.querySelector('.toolbar-item.profiles').style.display = 'none';" \
                    "document.querySelector('.toolbar-item.audits').style.display = 'none';" \
                    "document.querySelector('.toolbar-item.console').click();" \
                    "document.querySelector('#console-prompt').focus();" \
                "},200);" \
            "});");
        /* to debug inspector DOM uncomment folowing code :
        QWebPage* page = wv->page();
        instance->browser->setPage(page);
        page->settings()->setAttribute(QWebSettings::DeveloperExtrasEnabled, true);
        page->mainFrame()->setScrollBarPolicy(Qt::Horizontal, Qt::ScrollBarAsNeeded);
        page->mainFrame()->setScrollBarPolicy(Qt::Vertical, Qt::ScrollBarAsNeeded);
        instance->inspector->setPage(page);
        instance->inspector->setVisible(false);
        instance->inspector->setVisible(true);

        instance->backButton->setDefaultAction(instance->browser->pageAction(QWebPage::Back));
        instance->forwardButton->setDefaultAction(instance->browser->pageAction(QWebPage::Forward));
        instance->reloadButton->setDefaultAction(instance->browser->pageAction(QWebPage::Reload));
        */
    }
}

WebBrowser::WebBrowser(QWidget *parent) :
    QWidget(parent)
{
    addressBar = new QLineEdit(this);
    backButton = new QToolButton(this);
    forwardButton = new QToolButton(this);
    reloadButton = new QToolButton(this);
    browser = new QWebView(this);
    inspector = new QWebInspector(this);
    phantomInspector = new QWebInspector(this);
    backButton->setToolButtonStyle(Qt::ToolButtonTextUnderIcon);
    forwardButton->setToolButtonStyle(Qt::ToolButtonTextUnderIcon);
    reloadButton->setToolButtonStyle(Qt::ToolButtonTextUnderIcon);

    connect(addressBar, SIGNAL(returnPressed()), this, SLOT(loadPage()));

    QHBoxLayout *toolsLayout = new QHBoxLayout; // toolbar layout
    toolsLayout->addWidget(backButton);
    toolsLayout->addWidget(forwardButton);
    toolsLayout->addWidget(reloadButton);
    toolsLayout->addWidget(addressBar);

    QSplitter *splitterVertical = new QSplitter; // page+inspector splitter
    splitterVertical->setOrientation(Qt::Vertical);
    splitterVertical->addWidget(browser);
    splitterVertical->addWidget(inspector);

    QVBoxLayout *pageLayout = new QVBoxLayout; // toolbar+page+inspector layout
    pageLayout->addLayout(toolsLayout);
    pageLayout->addWidget(splitterVertical);

    QWidget* pageWidget = new QWidget; // toolbar+page+inspector widget
    pageWidget->setLayout(pageLayout);

    QSplitter *splitterHorizontal = new QSplitter; // toolbar+page+inspector + phantomInspector splitter
    splitterHorizontal->addWidget(pageWidget);
    splitterHorizontal->addWidget(phantomInspector);

    QHBoxLayout *mainLayout = new QHBoxLayout(this); // toolbar+page+inspector + phantomInspector widget
    mainLayout->addWidget(splitterHorizontal);

    connect(browser, SIGNAL(urlChanged(QUrl)),this, SLOT(updateAddressBar(QUrl)));
}

void WebBrowser::loadPage() {
    browser->load(QUrl::fromUserInput(addressBar->text()));
}

void WebBrowser::updateAddressBar(const QUrl &url) {
    QString urlChange = url.toString();
    addressBar->setText(urlChange);
}
/***** ivan > *****/
