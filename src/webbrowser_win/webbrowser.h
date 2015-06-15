/***** < ivan *****/
#ifndef WEBBROWSER_H
#define WEBBROWSER_H

#include <QWebPage>
#include "../webpage.h"
#include <QWidget>
#include <QUrl>
#include <QtGui>
#include <QWebView>

class QLineEdit;
class QToolButton;
class QWebView;

class WebBrowser : public QWidget
{
    Q_OBJECT
public:
    static void run(QWebPage *phantomPage, WebPage *webpage);
    static void setPage(WebPage* webpage);
private:
    static WebBrowser *instance;

private:
    WebBrowser(QWidget *parent = 0);

private slots:
    void loadPage();
    void updateAddressBar(const QUrl &url);
    void setupInspectors();
private:
    QLineEdit *addressBar;
    QToolButton *backButton;
    QToolButton *forwardButton;
    QToolButton *reloadButton;
    QWebView *browser;
    QWebInspector *inspector;
    QWebInspector *phantomInspector;
    QString *word;
    QStringList tempList;
};

#endif // WEBBROWSER_H

/***** ivan > *****/
